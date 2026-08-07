import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { canAccessAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { formatDayKeyMY } from "@/lib/datetime-my";

export default async function PerformancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOrg(locale);

  if (!canAccessAdmin(ctx.membership.role)) {
    redirect({ href: "/staff-dashboard", locale });
  }

  const t = await getTranslations("Nav");
  const tDash = await getTranslations("Dashboard");
  const supabase = await createClient();
  const orgId = ctx.organization.id;
  const since = new Date(Date.now() - 29 * 86400000);

  const [paymentsRes, invoicesRes, movementsRes, customersRes] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, paid_at")
      .eq("organization_id", orgId)
      .gte("paid_at", since.toISOString())
      .limit(3000),
    supabase
      .from("invoices")
      .select("total, amount_paid, status, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", since.toISOString())
      .limit(2000),
    supabase
      .from("stock_movements")
      .select("quantity, products(name)")
      .eq("organization_id", orgId)
      .eq("type", "sale")
      .gte("created_at", since.toISOString())
      .limit(2000),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", since.toISOString()),
  ]);

  const payments = paymentsRes.data || [];
  const revenue30 = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const invoices = invoicesRes.data || [];
  const invoiceCount = invoices.length;
  const avgInvoice = invoiceCount ? revenue30 / invoiceCount : 0;
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const collectionRate = invoiceCount ? (paidCount / invoiceCount) * 100 : 0;

  const byWeek = new Map<string, number>();
  for (const p of payments) {
    const d = new Date(p.paid_at as string);
    const key = formatDayKeyMY(new Date(d.getTime() - ((d.getDay() + 6) % 7) * 86400000));
    byWeek.set(key, (byWeek.get(key) || 0) + Number(p.amount || 0));
  }
  const weeks = [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const peakWeek = Math.max(1, ...weeks.map((w) => w[1]));

  const sellerMap = new Map<string, number>();
  for (const m of movementsRes.data || []) {
    const prod = Array.isArray(m.products) ? m.products[0] : m.products;
    const name = String((prod as { name?: string } | null)?.name || "Item");
    sellerMap.set(name, (sellerMap.get(name) || 0) + Number(m.quantity || 0));
  }
  const topSellers = [...sellerMap.entries()]
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 10);

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader title={t("performance")} subtitle={ctx.organization.name} />

      <section className="dash-admin-strip">
        <div className="surface dash-stat">
          <span className="kpi-label">Revenue (30d)</span>
          <strong className="kpi-value">{formatCurrency(revenue30)}</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Invoices (30d)</span>
          <strong className="kpi-value">{invoiceCount}</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Average invoice</span>
          <strong className="kpi-value">{formatCurrency(avgInvoice)}</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Collection rate</span>
          <strong className="kpi-value">{collectionRate.toFixed(0)}%</strong>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            new customers: {customersRes.count || 0}
          </span>
        </div>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <strong>Weekly revenue</strong>
        {weeks.length ? (
          <div className="dash-trend">
            {weeks.map(([week, amount]) => (
              <div key={week} className="dash-trend-col" title={formatCurrency(amount)}>
                <div
                  className="dash-trend-bar"
                  style={{ height: `${Math.round((amount / peakWeek) * 100)}%` }}
                />
                <span className="dash-trend-label">{week.slice(5)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">—</p>
        )}
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <strong>{tDash("topSellers")}</strong>
        {topSellers.length ? (
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="data">
              <tbody>
                {topSellers.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td style={{ textAlign: "right" }}>{s.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{tDash("topSellersEmpty")}</p>
        )}
      </section>
    </div>
  );
}
