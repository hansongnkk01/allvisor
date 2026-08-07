import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { canAccessAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { vocabLabels } from "@/lib/niches";
import { buildMarketingPlays } from "@/lib/marketing-plays";

export default async function MarketingPage({
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
  const supabase = await createClient();
  const orgId = ctx.organization.id;
  const V = vocabLabels(ctx.organization.niche, locale);
  const cutoff = new Date(Date.now() - 60 * 86400000).toISOString();

  const [totalRes, newRes, activePayersRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", cutoff),
    supabase
      .from("payments")
      .select("amount, invoices(customer_id)")
      .eq("organization_id", orgId)
      .gte("paid_at", cutoff)
      .limit(2000),
  ]);

  const payments = activePayersRes.data || [];
  const activeCustomers = new Set(
    payments
      .map((p) => {
        const inv = Array.isArray(p.invoices) ? p.invoices[0] : p.invoices;
        return (inv as { customer_id?: string } | null)?.customer_id;
      })
      .filter(Boolean) as string[]
  );
  const revenue60 = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const total = totalRes.count || 0;
  const dormant = Math.max(0, total - activeCustomers.size);
  const avgValue = activeCustomers.size ? revenue60 / activeCustomers.size : 0;

  const plays = buildMarketingPlays({
    niche: ctx.organization.niche,
    locale,
    entityLabel: V.entityTitle,
    dormant,
    newCount: newRes.count || 0,
    avgValue,
  });

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader title={t("marketing")} subtitle={ctx.organization.name} />

      <section className="dash-admin-strip">
        <div className="surface dash-stat">
          <span className="kpi-label">{V.entityTitle}</span>
          <strong className="kpi-value">{total}</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">New (60d)</span>
          <strong className="kpi-value">{newRes.count || 0}</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Active (60d)</span>
          <strong className="kpi-value">{activeCustomers.size}</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Dormant</span>
          <strong className="kpi-value">{dormant}</strong>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            avg value: {formatCurrency(avgValue)}
          </span>
        </div>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <strong>Suggested plays</strong>
        <div className="stack" style={{ gap: "0.75rem", marginTop: "0.85rem" }}>
          {plays.map((play) => (
            <article
              key={play.title}
              style={{
                padding: "0.75rem 0.9rem",
                borderRadius: 12,
                border: "1px solid var(--border, rgba(15,23,42,.1))",
              }}
            >
              <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <strong>{play.title}</strong>
                <span className="badge">{play.effort}</span>
              </div>
              <p className="muted" style={{ margin: "0.35rem 0 0", lineHeight: 1.5 }}>
                {play.detail}
              </p>
            </article>
          ))}
        </div>
        <Link href="/customers" className="btn btn-soft" style={{ marginTop: 12 }}>
          {V.entityTitle}
        </Link>
      </section>
    </div>
  );
}
