import { createClient } from "@/lib/supabase/server";
import { dayBoundsMY, formatDayKeyMY } from "@/lib/datetime-my";
import { isOpsBrainEnabled } from "@/lib/ops-brain/enabled";
import type { OrgContext } from "@/lib/types";
import type { SharedDashboardData } from "@/lib/dashboard-data";
import type { DbAlertTip } from "@/components/DashboardAiPanel";

type Risk = "high" | "medium" | "low" | null;

function asRisk(v: unknown): Risk {
  if (v === "high" || v === "medium" || v === "low") return v;
  return null;
}

export async function loadLiveDashboardData(
  ctx: OrgContext,
  opts: { forAdmin: boolean }
): Promise<SharedDashboardData & { unpaidTotal: number }> {
  const supabase = await createClient();
  const orgId = ctx.organization.id;
  const niche = ctx.organization.niche;
  const now = new Date();
  const { start: todayStart, end: todayEnd } = dayBoundsMY(now);
  const monthStart = `${formatDayKeyMY(now).slice(0, 7)}-01`;
  const scoreDate = formatDayKeyMY(now);
  const opsOn = isOpsBrainEnabled(ctx.organization);

  const [
    customersRes,
    unpaidRes,
    stockRes,
    recentRes,
    ledgerRes,
    lhdnRes,
    paidRes,
    todayApptsRes,
    upcomingRes,
    saleMovementsRes,
    profilesRes,
    activitiesRes,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("invoices")
      .select("id, total, amount_paid")
      .eq("organization_id", orgId)
      .in("status", ["unpaid", "partial"]),
    supabase
      .from("products")
      .select("name, quantity, low_stock_threshold")
      .eq("organization_id", orgId)
      .limit(400),
    supabase
      .from("invoices")
      .select("id, title, invoice_number, status, total, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(8),
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
      .neq("lhdn_status", "accepted"),
    supabase
      .from("payments")
      .select("id, amount, paid_at, invoices(title, invoice_number, customers(name))")
      .eq("organization_id", orgId)
      .gte("paid_at", todayStart.toISOString())
      .lte("paid_at", todayEnd.toISOString()),
    supabase
      .from("appointments")
      .select("id, title, starts_at, ends_at, status, notes, customers(name, risk_level, allergies)")
      .eq("organization_id", orgId)
      .gte("starts_at", todayStart.toISOString())
      .lte("starts_at", todayEnd.toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("appointments")
      .select("id, title, starts_at, ends_at, status, notes, customers(name, risk_level, allergies)")
      .eq("organization_id", orgId)
      .gte("starts_at", todayStart.toISOString())
      .lte("starts_at", todayEnd.toISOString())
      .order("starts_at", { ascending: true })
      .limit(8),
    supabase
      .from("stock_movements")
      .select("quantity, products(name)")
      .eq("organization_id", orgId)
      .eq("type", "sale")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .limit(500),
    supabase.from("profiles").select("id, full_name, email").limit(100),
    opts.forAdmin
      ? supabase
          .from("activity_logs")
          .select("summary, created_at, actor_name")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] as Array<{ summary: string; actor_name: string | null }> }),
  ]);

  let alerts: DbAlertTip[] = [];
  let scores: Array<{
    user_id: string;
    score: number;
    sales_amount: number;
    refund_rate: number;
    transaction_count: number;
  }> = [];
  let tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assigned_to: string | null;
  }> = [];
  let briefingContent: string | null = null;

  if (opsOn) {
    const alertsRes = await supabase
      .from("alerts")
      .select("id, title, message, severity, status")
      .eq("organization_id", orgId)
      .in("status", ["open", "investigating"])
      .order("created_at", { ascending: false })
      .limit(opts.forAdmin ? 20 : 10);
    if (!alertsRes.error && alertsRes.data) {
      alerts = alertsRes.data as DbAlertTip[];
    }

    const scoresRes = await supabase
      .from("staff_scores")
      .select("user_id, score, sales_amount, refund_rate, transaction_count")
      .eq("organization_id", orgId)
      .eq("score_date", scoreDate)
      .order("score", { ascending: false })
      .limit(15);
    if (!scoresRes.error && scoresRes.data) {
      scores = scoresRes.data as typeof scores;
    }

    if (opts.forAdmin) {
      const briefRes = await supabase
        .from("ai_briefings")
        .select("content")
        .eq("organization_id", orgId)
        .eq("period_type", "daily")
        .eq("period_key", scoreDate)
        .eq("locale", ctx.organization.locale_default === "en" ? "en" : "ms")
        .maybeSingle();
      if (!briefRes.error && briefRes.data?.content) {
        briefingContent = String(briefRes.data.content);
      }
    }
  }

  const tasksRes = await supabase
    .from("tasks")
    .select("id, title, status, priority, assigned_to")
    .eq("organization_id", orgId)
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(20);
  if (!tasksRes.error && tasksRes.data) {
    tasks = tasksRes.data as typeof tasks;
  }

  const unpaidRows = unpaidRes.data || [];
  const unpaidCount = unpaidRows.length;
  const unpaidTotal = unpaidRows.reduce(
    (s, r) => s + Math.max(0, Number(r.total) - Number(r.amount_paid || 0)),
    0
  );
  const stockRows = stockRes.data || [];
  const lowStockItems = stockRows
    .filter((p) => Number(p.quantity) <= Number(p.low_stock_threshold))
    .map((p) => String(p.name || "").trim())
    .filter(Boolean);
  const ledger = ledgerRes.data || [];
  const income = ledger
    .filter((e) => e.entry_type === "income")
    .reduce((s, e) => s + Number(e.amount), 0);
  const expense = ledger
    .filter((e) => e.entry_type === "expense")
    .reduce((s, e) => s + Number(e.amount), 0);
  const paidToday = paidRes.data || [];
  const salesToday = paidToday.reduce((s, p) => s + Number(p.amount), 0);

  const profiles = profilesRes.data || [];
  const nameById = new Map(
    profiles.map((p) => [p.id as string, (p.full_name || p.email || "Staff") as string])
  );

  const staffScores = scores.map((s) => ({
    userId: s.user_id,
    name: nameById.get(s.user_id) || "Staff",
    score: Number(s.score || 0),
    salesAmount: Number(s.sales_amount || 0),
    refundRate: Number(s.refund_rate || 0),
    transactionCount: Number(s.transaction_count || 0),
  }));

  const myScore = staffScores.find((s) => s.userId === ctx.profile.id) || null;

  const taskRows = tasks
    .filter((t) => (opts.forAdmin ? true : t.assigned_to === ctx.profile.id || !t.assigned_to))
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignedToName: t.assigned_to ? nameById.get(t.assigned_to) || null : null,
    }));

  const dbAlerts: DbAlertTip[] = alerts.filter((a) =>
    opts.forAdmin ? true : a.severity !== "high"
  );

  const topSellerMap = new Map<string, number>();
  for (const m of saleMovementsRes.data || []) {
    const prod = Array.isArray(m.products) ? m.products[0] : m.products;
    const name = String((prod as { name?: string } | null)?.name || "").trim() || "Item";
    topSellerMap.set(name, (topSellerMap.get(name) || 0) + Number(m.quantity || 0));
  }
  const topSellers = [...topSellerMap.entries()]
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);

  const mapAppt = (a: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    status?: string;
    notes?: string | null;
    customers?: unknown;
  }) => {
    const custRaw = Array.isArray(a.customers) ? a.customers[0] : a.customers;
    const cust = custRaw as
      | { name: string; risk_level?: string | null; allergies?: string | null }
      | null;
    return {
      id: a.id,
      title: a.title,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      status: a.status,
      notes: a.notes,
      customers: cust
        ? {
            name: cust.name,
            risk_level: asRisk(cust.risk_level),
            allergies: cust.allergies ?? null,
          }
        : null,
    };
  };

  const marketingIdeas =
    niche === "tuition"
      ? ["Promote term packages on WhatsApp", "Offer sibling discount this month"]
      : niche === "clinic"
        ? ["Remind overdue checkups", "Bundle wellness packages"]
        : ["Weekend promo for slow SKUs", "Bundle top sellers with add-ons"];

  const activities = activitiesRes.data || [];

  return {
    unpaidTotal,
    niche,
    orgName: ctx.organization.name,
    welcomeName: ctx.profile.full_name || ctx.organization.name,
    kpi: {
      salesToday,
      appointmentsToday: (todayApptsRes.data || []).length,
      unpaidCount,
      customerCount: customersRes.count || 0,
      lowStockCount: lowStockItems.length,
      lowStockNames: lowStockItems,
      income,
      expense,
      lhdnPending: lhdnRes.count || 0,
      orgHasTin: Boolean(ctx.organization.tin),
      txnToday: paidToday.length,
    },
    dbAlerts,
    opsBrainEnabled: opsOn,
    recentInvoices: (recentRes.data || []).map((inv) => ({
      id: inv.id,
      label: inv.title || inv.invoice_number,
      subtitle: inv.invoice_number,
      amount: Number(inv.total),
      at: inv.created_at,
    })),
    todaySales: paidToday.map((p) => {
      const inv = Array.isArray(p.invoices) ? p.invoices[0] : p.invoices;
      const cust = inv
        ? Array.isArray(inv.customers)
          ? inv.customers[0]
          : inv.customers
        : null;
      return {
        id: p.id as string,
        label: String(
          (inv as { title?: string; invoice_number?: string } | null)?.title ||
            (inv as { invoice_number?: string } | null)?.invoice_number ||
            "Sale"
        ),
        subtitle: (cust as { name?: string } | null)?.name || null,
        amount: Number(p.amount),
        at: p.paid_at as string,
      };
    }),
    upcomingAppointments: (upcomingRes.data || []).map(mapAppt),
    todayAppointments: (todayApptsRes.data || []).map(mapAppt),
    topSellers,
    staffScores: opts.forAdmin ? staffScores : [],
    myScore: opts.forAdmin ? null : myScore,
    tasks: taskRows,
    briefing: briefingContent,
    activitySummary: activities.map(
      (a) => `${a.actor_name || "Staff"}: ${a.summary}`
    ),
    marketingIdeas,
  };
}
