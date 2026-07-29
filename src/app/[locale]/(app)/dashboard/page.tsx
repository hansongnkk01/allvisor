import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { startOfDay, endOfDay } from "date-fns";
import { DayHourTimetable } from "@/components/DayHourTimetable";
import { DashboardAiPanel } from "@/components/DashboardAiPanel";

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

  const [
    { count: customerCount },
    { count: unpaidCount },
    { data: products },
    { data: recentInvoices },
    { data: ledger },
    { count: lhdnPending },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("status", ["unpaid", "partial"]),
    supabase.from("products").select("*").eq("organization_id", orgId),
    supabase
      .from("invoices")
      .select("*, customers(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("ledger_entries").select("entry_type, amount").eq("organization_id", orgId),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("lhdn_status", ["not_submitted", "pending", "rejected"]),
  ]);

  let appointmentsToday = 0;
  let salesToday = 0;
  let upcoming: Array<{
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    customers?: { name: string } | null;
  }> = [];
  let todayAppts: typeof upcoming = [];

  if (niche === "clinic") {
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("starts_at", startOfDay(now).toISOString())
      .lte("starts_at", endOfDay(now).toISOString());
    appointmentsToday = count || 0;

    const { data } = await supabase
      .from("appointments")
      .select("*, customers(name)")
      .eq("organization_id", orgId)
      .gte("starts_at", now.toISOString())
      .order("starts_at", { ascending: true })
      .limit(5);
    upcoming = data || [];

    const { data: todayData } = await supabase
      .from("appointments")
      .select("id, title, starts_at, ends_at, customers(name)")
      .eq("organization_id", orgId)
      .gte("starts_at", startOfDay(now).toISOString())
      .lte("starts_at", endOfDay(now).toISOString())
      .order("starts_at", { ascending: true });
    todayAppts = (todayData || []).map((a) => ({
      id: a.id,
      title: a.title,
      starts_at: a.starts_at,
      ends_at: a.ends_at,
      customers: Array.isArray(a.customers)
        ? a.customers[0] || null
        : a.customers,
    }));
  } else {
    const { data: paidToday } = await supabase
      .from("payments")
      .select("amount")
      .eq("organization_id", orgId)
      .gte("paid_at", startOfDay(now).toISOString())
      .lte("paid_at", endOfDay(now).toISOString());
    salesToday = (paidToday || []).reduce((sum, p) => sum + Number(p.amount), 0);
  }

  const lowStockCount =
    products?.filter((p) => p.quantity <= p.low_stock_threshold).length || 0;

  const income = (ledger || [])
    .filter((e) => e.entry_type === "income")
    .reduce((s, e) => s + Number(e.amount), 0);
  const expense = (ledger || [])
    .filter((e) => e.entry_type === "expense")
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <div
        className="row"
        style={{
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <PageHeader
          title={`${t("welcome")}, ${ctx.profile.full_name || ctx.organization.name}`}
          subtitle={ctx.organization.name}
        />
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

      <div className="grid-kpi">
        {niche === "clinic" ? (
          <div className="surface kpi">
            <div className="kpi-label">{t("appointmentsToday")}</div>
            <div className="kpi-value">{appointmentsToday}</div>
          </div>
        ) : (
          <div className="surface kpi">
            <div className="kpi-label">{t("salesToday")}</div>
            <div className="kpi-value">{formatCurrency(salesToday)}</div>
          </div>
        )}
        <div className="surface kpi">
          <div className="kpi-label">{t("unpaidInvoices")}</div>
          <div className="kpi-value">{unpaidCount || 0}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{niche === "clinic" ? t("patients") : t("customers")}</div>
          <div className="kpi-value">{customerCount || 0}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("lowStock")}</div>
          <div className="kpi-value">{lowStockCount}</div>
        </div>
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
          labels={{
            timetable: t("miniTimetable"),
            occupied: t("occupied"),
            free: t("free"),
          }}
        />
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
        }}
      >
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("recentInvoices")}</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(recentInvoices || []).map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <div>{inv.title || inv.invoice_number}</div>
                      <div className="muted" style={{ fontSize: "0.8rem" }}>
                        {formatDateTime(inv.created_at)}
                      </div>
                    </td>
                    <td>
                      <span className="badge">{inv.status}</span>
                    </td>
                    <td>{formatCurrency(Number(inv.total))}</td>
                  </tr>
                ))}
                {!recentInvoices?.length ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      —
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {niche === "clinic" ? (
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>{t("upcomingAppointments")}</h3>
            <div className="stack" style={{ gap: "0.75rem" }}>
              {upcoming.map((a) => (
                <div key={a.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
                  <strong>{a.title}</strong>
                  <div className="muted" style={{ fontSize: "0.9rem" }}>
                    {a.customers?.name} · {formatDateTime(a.starts_at)}
                  </div>
                </div>
              ))}
              {!upcoming.length ? <p className="muted">—</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
