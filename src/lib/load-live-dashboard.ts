import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { hasCapability } from "@/lib/niches";
import { audienceForRole } from "@/lib/roles";
import { dayBoundsMY, formatDayKeyMY } from "@/lib/datetime-my";
import { marketingPlays } from "@/lib/marketing-plays";
import { loadNicheCards } from "@/lib/load-niche-cards";
import { loadAdminNicheCards } from "@/lib/load-admin-niche-cards";
import {
  RECEIVABLE_OVERDUE_DAYS,
  REVENUE_TREND_DAYS,
  type AdminInsights,
  type DashboardAppointmentRow,
  type SharedDashboardData,
} from "@/lib/dashboard-data";
import type { Niche } from "@/lib/types";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

type RawAppointment = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status?: string;
  notes?: string | null;
  customers?:
    | { name: string; risk_level?: "high" | "medium" | "low" | null; allergies?: string | null }
    | { name: string; risk_level?: "high" | "medium" | "low" | null; allergies?: string | null }[]
    | null;
};

function mapAppointment(row: RawAppointment): DashboardAppointmentRow {
  return {
    id: row.id,
    title: row.title,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    notes: row.notes,
    customers: Array.isArray(row.customers) ? row.customers[0] || null : row.customers,
  };
}

const TOP_SELLER_WINDOW_DAYS = 30;

/** Owner-only aggregates. Kept in one place so the staff path never pays for them. */
async function loadAdminInsights({
  supabase,
  orgId,
  niche,
  locale,
  now,
}: {
  supabase: ServerSupabase;
  orgId: string;
  niche: Niche;
  locale: string;
  now: Date;
}): Promise<AdminInsights> {
  const { end: todayEnd } = dayBoundsMY(now);
  const { start: trendStart } = dayBoundsMY(
    new Date(now.getTime() - (REVENUE_TREND_DAYS - 1) * 86400000)
  );
  const monthKey = formatDayKeyMY(now).slice(0, 7);
  const [monthYear, monthNumber] = monthKey.split("-").map(Number);
  const lastMonthDate = new Date(Date.UTC(monthYear, monthNumber - 2, 1));
  const lastMonthStart = `${lastMonthDate.toISOString().slice(0, 7)}-01`;
  const overdueCutoff = new Date(now.getTime() - RECEIVABLE_OVERDUE_DAYS * 86400000);

  const [
    { data: trendPayments },
    { data: lastMonthLedger },
    { data: openInvoices },
    { data: activityRows },
    { count: teamSize },
    { count: branchCount },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, paid_at")
      .eq("organization_id", orgId)
      .gte("paid_at", trendStart.toISOString())
      .lte("paid_at", todayEnd.toISOString()),
    supabase
      .from("ledger_entries")
      .select("entry_type, amount")
      .eq("organization_id", orgId)
      .gte("entry_date", lastMonthStart)
      .lt("entry_date", `${monthKey}-01`),
    supabase
      .from("invoices")
      .select("total, amount_paid, created_at")
      .eq("organization_id", orgId)
      .in("status", ["unpaid", "partial"])
      .limit(500),
    supabase
      .from("activity_logs")
      .select("id, actor_name, summary, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("branch_links")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
  ]);

  const amountByDay = new Map<string, number>();
  for (let offset = REVENUE_TREND_DAYS - 1; offset >= 0; offset -= 1) {
    amountByDay.set(formatDayKeyMY(new Date(now.getTime() - offset * 86400000)), 0);
  }
  for (const payment of trendPayments || []) {
    const key = formatDayKeyMY(new Date(payment.paid_at as string));
    if (amountByDay.has(key)) {
      amountByDay.set(key, (amountByDay.get(key) || 0) + Number(payment.amount));
    }
  }

  let receivablesCurrent = 0;
  let receivablesOverdue = 0;
  let receivablesOverdueCount = 0;
  for (const invoice of openInvoices || []) {
    const outstanding = Math.max(
      0,
      Number(invoice.total) - Number(invoice.amount_paid || 0)
    );
    if (outstanding <= 0) continue;
    if (new Date(invoice.created_at as string) < overdueCutoff) {
      receivablesOverdue += outstanding;
      receivablesOverdueCount += 1;
    } else {
      receivablesCurrent += outstanding;
    }
  }

  return {
    revenueTrend: [...amountByDay.entries()].map(([day, amount]) => ({ day, amount })),
    lastMonthIncome: (lastMonthLedger || [])
      .filter((entry) => entry.entry_type === "income")
      .reduce((sum, entry) => sum + Number(entry.amount), 0),
    lastMonthExpense: (lastMonthLedger || [])
      .filter((entry) => entry.entry_type === "expense")
      .reduce((sum, entry) => sum + Number(entry.amount), 0),
    receivablesCurrent,
    receivablesOverdue,
    receivablesOverdueCount,
    overdueAfterDays: RECEIVABLE_OVERDUE_DAYS,
    activity: (activityRows || []).map((row) => ({
      id: row.id as string,
      actor: (row.actor_name as string | null) ?? null,
      summary: (row.summary as string) || "",
      created_at: row.created_at as string,
    })),
    teamSize: teamSize || 0,
    branchCount: branchCount || 0,
    marketing: marketingPlays(niche, locale),
  };
}

/** Fills the shared contract from Supabase. Always scoped to one organization. */
export async function loadLiveDashboard(locale: string): Promise<SharedDashboardData> {
  const ctx = await requireOrg(locale);
  const supabase = await createClient();
  const orgId = ctx.organization.id;
  const niche = ctx.organization.niche;
  const audience = audienceForRole(ctx.membership.role);
  const canAppointments = hasCapability(niche, "appointments");
  const canPos = hasCapability(niche, "pos");

  const now = new Date();
  const { start: todayStart, end: todayEnd } = dayBoundsMY(now);
  const monthStart = `${formatDayKeyMY(now).slice(0, 7)}-01`;

  const [
    { count: customerCount },
    { data: unpaidRows },
    { data: stockRows },
    { data: recentInvoices },
    { data: ledger },
    { count: lhdnPending },
    { count: lhdnRejected },
    { count: appointmentsTodayCount },
    { count: noShowTodayCount },
    { data: upcomingData },
    { data: todayData },
    { data: paidToday },
    { data: paidTodayDetail },
    { data: saleMovements },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("invoices")
      .select("total, amount_paid")
      .eq("organization_id", orgId)
      .in("status", ["unpaid", "partial"]),
    supabase
      .from("products")
      .select("name, quantity, low_stock_threshold")
      .eq("organization_id", orgId),
    supabase
      .from("invoices")
      .select("id, title, invoice_number, status, total, created_at, customers(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("ledger_entries")
      .select("entry_type, amount")
      .eq("organization_id", orgId)
      .gte("entry_date", monthStart),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "paid")
      .in("lhdn_status", ["not_submitted", "pending"]),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "paid")
      .eq("lhdn_status", "rejected"),
    canAppointments
      ? supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .gte("starts_at", todayStart.toISOString())
          .lte("starts_at", todayEnd.toISOString())
      : Promise.resolve({ count: 0 }),
    canAppointments
      ? supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("status", "no_show")
          .gte("starts_at", todayStart.toISOString())
          .lte("starts_at", todayEnd.toISOString())
      : Promise.resolve({ count: 0 }),
    canAppointments
      ? supabase
          .from("appointments")
          .select(
            "id, title, starts_at, ends_at, status, notes, customers(name, risk_level, allergies)"
          )
          .eq("organization_id", orgId)
          .gte("starts_at", now.toISOString())
          .lte("starts_at", todayEnd.toISOString())
          .order("starts_at", { ascending: true })
          .limit(20)
      : Promise.resolve({ data: [] as never[] }),
    canAppointments
      ? supabase
          .from("appointments")
          .select(
            "id, title, starts_at, ends_at, status, notes, customers(name, risk_level, allergies)"
          )
          .eq("organization_id", orgId)
          .gte("starts_at", todayStart.toISOString())
          .lte("starts_at", todayEnd.toISOString())
          .order("starts_at", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("payments")
      .select("amount")
      .eq("organization_id", orgId)
      .gte("paid_at", todayStart.toISOString())
      .lte("paid_at", todayEnd.toISOString()),
    canPos
      ? supabase
          .from("payments")
          .select("id, amount, paid_at, invoices(invoice_number, title, customers(name))")
          .eq("organization_id", orgId)
          .gte("paid_at", todayStart.toISOString())
          .lte("paid_at", todayEnd.toISOString())
          .order("paid_at", { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as never[] }),
    canPos
      ? supabase
          .from("stock_movements")
          .select("quantity, products(name)")
          .eq("organization_id", orgId)
          .eq("type", "sale")
          .gte(
            "created_at",
            new Date(now.getTime() - TOP_SELLER_WINDOW_DAYS * 86400000).toISOString()
          )
          .limit(500)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const unpaidTotal = (unpaidRows || []).reduce(
    (sum, inv) => sum + Math.max(0, Number(inv.total) - Number(inv.amount_paid || 0)),
    0
  );

  const todaySales = (paidTodayDetail || []).map((payment) => {
    const invoice = Array.isArray(payment.invoices) ? payment.invoices[0] : payment.invoices;
    const customer = invoice
      ? Array.isArray(invoice.customers)
        ? invoice.customers[0]
        : invoice.customers
      : null;
    return {
      id: payment.id as string,
      label: (invoice?.title || invoice?.invoice_number || "Sale") as string,
      customer: (customer?.name as string | undefined) || null,
      amount: Number(payment.amount),
      paid_at: payment.paid_at as string,
    };
  });

  const unitsByProduct = new Map<string, number>();
  for (const movement of saleMovements || []) {
    const product = Array.isArray(movement.products) ? movement.products[0] : movement.products;
    const name = String(product?.name || "").trim() || "Item";
    unitsByProduct.set(name, (unitsByProduct.get(name) || 0) + Number(movement.quantity || 0));
  }
  const topSellers = [...unitsByProduct.entries()]
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);

  const lowStockNames = (stockRows || [])
    .filter((product) => Number(product.quantity) <= Number(product.low_stock_threshold))
    .map((product) => String(product.name || "").trim())
    .filter(Boolean);

  const [nicheCards, adminInsights] = await Promise.all([
    audience === "admin"
      ? loadAdminNicheCards({ supabase, orgId, niche, now })
      : loadNicheCards({ supabase, orgId, niche, now }),
    audience === "admin"
      ? loadAdminInsights({ supabase, orgId, niche, locale, now })
      : Promise.resolve(undefined),
  ]);

  const incomeMonth = (ledger || [])
    .filter((entry) => entry.entry_type === "income")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
  const expenseMonth = (ledger || [])
    .filter((entry) => entry.entry_type === "expense")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);

  return {
    niche,
    audience,
    orgName: ctx.organization.name,
    greetingName: ctx.profile.full_name || ctx.organization.name,
    nowIso: now.toISOString(),
    hours: {
      openHour: ctx.organization.clinic_open_hour ?? 0,
      closeHour: ctx.organization.clinic_close_hour ?? 23,
      closedWeekdays: ctx.organization.closed_weekdays || [],
    },
    kpis: {
      appointmentsToday: appointmentsTodayCount || 0,
      noShowToday: noShowTodayCount || 0,
      salesToday: (paidToday || []).reduce((sum, p) => sum + Number(p.amount), 0),
      txnToday: paidToday?.length || 0,
      unpaidCount: unpaidRows?.length || 0,
      unpaidTotal,
      customerCount: customerCount || 0,
      lowStockCount: lowStockNames.length,
      lowStockNames,
      incomeMonth,
      expenseMonth,
      lhdnPendingCount: lhdnPending || 0,
      lhdnRejectedCount: lhdnRejected || 0,
      orgHasTin: Boolean(ctx.organization.tin),
    },
    recentInvoices: (recentInvoices || []).map((invoice) => ({
      id: invoice.id as string,
      title: invoice.title as string,
      invoice_number: invoice.invoice_number as string,
      status: invoice.status as string,
      total: Number(invoice.total),
      created_at: invoice.created_at as string,
    })),
    upcomingAppointments: (upcomingData || []).map(mapAppointment),
    todayAppointments: (todayData || []).map(mapAppointment),
    todaySales,
    topSellers,
    nicheCards,
    adminInsights,
  };
}
