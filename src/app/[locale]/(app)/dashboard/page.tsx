import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { DayHourTimetable } from "@/components/DayHourTimetable";
import { DashboardAiPanel } from "@/components/DashboardAiPanel";
import { DashboardRecentInvoices, DashboardUpcomingAppointments } from "@/components/DashboardLists";
import { dayBoundsMY, formatDayKeyMY } from "@/lib/datetime-my";

type ApptRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status?: string;
  notes?: string | null;
  customers?: { name: string; risk_level?: "high" | "medium" | "low" | null } | null;
};

function mapAppt(a: {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status?: string;
  notes?: string | null;
  customers?:
    | { name: string; risk_level?: "high" | "medium" | "low" | null }
    | { name: string; risk_level?: "high" | "medium" | "low" | null }[]
    | null;
}): ApptRow {
  return {
    id: a.id,
    title: a.title,
    starts_at: a.starts_at,
    ends_at: a.ends_at,
    status: a.status,
    notes: a.notes,
    customers: Array.isArray(a.customers) ? a.customers[0] || null : a.customers,
  };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();
  const orgId = ctx.organization.id;
  const niche = ctx.organization.niche;
  const now = new Date();
  const { start: todayStart, end: todayEnd } = dayBoundsMY(now);
  const monthStart = `${formatDayKeyMY(now).slice(0, 7)}-01`;

  const [
    { count: customerCount },
    { count: unpaidCount },
    { data: stockRows },
    { data: recentInvoices },
    { data: ledger },
    { count: lhdnPending },
    { count: appointmentsTodayCount },
    { data: upcomingData },
    { data: todayData },
    { data: paidToday },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("status", ["unpaid", "partial"]),
    supabase
      .from("products")
      .select("quantity, low_stock_threshold")
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
    // Only paid invoices awaiting MyInvois confirmation (auto-submit on Pay)
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "paid")
      .in("lhdn_status", ["not_submitted", "pending", "rejected"]),
    niche === "clinic"
      ? supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .gte("starts_at", todayStart.toISOString())
          .lte("starts_at", todayEnd.toISOString())
      : Promise.resolve({ count: 0 }),
    niche === "clinic"
      ? supabase
          .from("appointments")
          .select("id, title, starts_at, ends_at, status, notes, customers(name, risk_level)")
          .eq("organization_id", orgId)
          .gte("starts_at", now.toISOString())
          .order("starts_at", { ascending: true })
          .limit(12)
      : Promise.resolve({ data: [] as never[] }),
    niche === "clinic"
      ? supabase
          .from("appointments")
          .select("id, title, starts_at, ends_at, status, notes, customers(name, risk_level)")
          .eq("organization_id", orgId)
          .gte("starts_at", todayStart.toISOString())
          .lte("starts_at", todayEnd.toISOString())
          .order("starts_at", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
    niche === "retail"
      ? supabase
          .from("payments")
          .select("amount")
          .eq("organization_id", orgId)
          .gte("paid_at", todayStart.toISOString())
          .lte("paid_at", todayEnd.toISOString())
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const appointmentsToday = appointmentsTodayCount || 0;
  const salesToday = (paidToday || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const upcoming = (upcomingData || []).map(mapAppt);
  const todayAppts = (todayData || []).map(mapAppt);

  const lowStockCount =
    stockRows?.filter((p) => Number(p.quantity) <= Number(p.low_stock_threshold)).length || 0;

  const income = (ledger || [])
    .filter((e) => e.entry_type === "income")
    .reduce((s, e) => s + Number(e.amount), 0);
  const expense = (ledger || [])
    .filter((e) => e.entry_type === "expense")
    .reduce((s, e) => s + Number(e.amount), 0);

  const kpiCards = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.65rem",
        flex: "1 1 280px",
        minWidth: 0,
      }}
    >
      {niche === "clinic" ? (
        <div className="surface kpi" style={{ margin: 0 }}>
          <div className="kpi-label">{t("appointmentsToday")}</div>
          <div className="kpi-value">{appointmentsToday}</div>
        </div>
      ) : (
        <div className="surface kpi" style={{ margin: 0 }}>
          <div className="kpi-label">{t("salesToday")}</div>
          <div className="kpi-value">{formatCurrency(salesToday)}</div>
        </div>
      )}
      <div className="surface kpi" style={{ margin: 0 }}>
        <div className="kpi-label">{t("unpaidInvoices")}</div>
        <div className="kpi-value">{unpaidCount || 0}</div>
      </div>
      <div className="surface kpi" style={{ margin: 0 }}>
        <div className="kpi-label">{niche === "clinic" ? t("patients") : t("customers")}</div>
        <div className="kpi-value">{customerCount || 0}</div>
      </div>
      <div className="surface kpi" style={{ margin: 0 }}>
        <div className="kpi-label">{t("lowStock")}</div>
        <div className="kpi-value">{lowStockCount}</div>
      </div>
    </div>
  );

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title={`${t("welcome")}, ${ctx.profile.full_name || ctx.organization.name}`}
        subtitle={ctx.organization.name}
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.85rem",
          alignItems: "stretch",
        }}
      >
        {kpiCards}
        <DashboardAiPanel
          title={t("aiTitle")}
          data={{
            niche,
            patients: customerCount || 0,
            unpaidInvoices: unpaidCount || 0,
            lowStock: lowStockCount,
            income,
            expense,
            appointmentsToday,
            lhdnPending: lhdnPending || 0,
            orgHasTin: Boolean(ctx.organization.tin),
          }}
        />
      </div>

      <div className="row">
        <span className="muted">{t("quickActions")}:</span>
        <Link href="/customers" className="btn btn-soft">
          {niche === "clinic" ? t("patients") : t("customers")}
        </Link>
        <Link href="/invoices" className="btn btn-soft">
          Invoices
        </Link>
        {niche === "clinic" ? (
          <Link href="/appointments" className="btn btn-soft">
            Appointments
          </Link>
        ) : (
          <Link href="/pos" className="btn btn-soft">
            POS
          </Link>
        )}
      </div>

      {niche === "clinic" ? (
        <DayHourTimetable
          date={now}
          appointments={todayAppts}
          orientation="horizontal"
          hoursConfig={{
            openHour: ctx.organization.clinic_open_hour ?? 0,
            closeHour: ctx.organization.clinic_close_hour ?? 23,
            closedWeekdays: ctx.organization.closed_weekdays || [],
            locale,
          }}
          labels={{
            timetable: t("miniTimetable"),
            occupied: t("occupied"),
            free: t("free"),
            closed: t("clinicClosed"),
            publicHoliday: t("publicHoliday"),
          }}
        />
      ) : null}

      <div className="fluid-grid">
        <DashboardRecentInvoices
          title={t("recentInvoices")}
          invoices={(recentInvoices || []).map((inv) => ({
            id: inv.id,
            title: inv.title,
            invoice_number: inv.invoice_number,
            status: inv.status,
            total: Number(inv.total),
            created_at: inv.created_at,
          }))}
        />

        {niche === "clinic" ? (
          <DashboardUpcomingAppointments title={t("upcomingAppointments")} items={upcoming} />
        ) : null}
      </div>
    </div>
  );
}
