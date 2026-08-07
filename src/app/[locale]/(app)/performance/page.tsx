import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOwner } from "@/lib/require-owner";
import { PageHeader } from "@/components/PageHeader";
import { RevenueTrendChart } from "@/components/dashboards/RevenueTrendChart";
import { formatCurrency } from "@/lib/utils";
import { dayBoundsMY, formatDayKeyMY } from "@/lib/datetime-my";
import { REVENUE_TREND_DAYS as TREND_DAYS } from "@/lib/dashboard-data";

export default async function PerformancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Owner");
  const { supabase, organization } = await requireOwner(locale);
  const orgId = organization.id;

  const now = new Date();
  const { end: todayEnd } = dayBoundsMY(now);
  const trendStart = new Date(now.getTime() - (TREND_DAYS - 1) * 86400000);
  const { start: trendStartBound } = dayBoundsMY(trendStart);
  const monthStart = `${formatDayKeyMY(now).slice(0, 7)}-01`;

  const [{ data: trendPayments }, { data: ledger }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, paid_at")
      .eq("organization_id", orgId)
      .gte("paid_at", trendStartBound.toISOString())
      .lte("paid_at", todayEnd.toISOString()),
    supabase
      .from("ledger_entries")
      .select("entry_type, amount")
      .eq("organization_id", orgId)
      .gte("entry_date", monthStart),
  ]);

  const byDay = new Map<string, number>();
  for (let i = 0; i < TREND_DAYS; i += 1) {
    const day = new Date(now.getTime() - (TREND_DAYS - 1 - i) * 86400000);
    byDay.set(formatDayKeyMY(day), 0);
  }
  for (const payment of trendPayments || []) {
    const key = formatDayKeyMY(new Date(payment.paid_at as string));
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) || 0) + Number(payment.amount));
  }
  const trend = [...byDay.entries()].map(([day, amount]) => ({ day, amount }));
  const trendTotal = trend.reduce((sum, point) => sum + point.amount, 0);

  const income = (ledger || [])
    .filter((e) => e.entry_type === "income")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const expense = (ledger || [])
    .filter((e) => e.entry_type === "expense")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("performanceTitle")} subtitle={t("performanceSubtitle")} />

      <div className="fluid-grid">
        <div className="surface kpi">
          <div className="kpi-label">{t("revenue14")}</div>
          <div className="kpi-value">{formatCurrency(trendTotal)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("monthIncome")}</div>
          <div className="kpi-value">{formatCurrency(income)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("monthExpense")}</div>
          <div className="kpi-value">{formatCurrency(expense)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("monthProfit")}</div>
          <div className="kpi-value">{formatCurrency(income - expense)}</div>
        </div>
      </div>

      <section className="surface" style={{ padding: "1rem" }}>
        <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>{t("revenueTrendTitle")}</h2>
        <RevenueTrendChart points={trend} empty={t("trendEmpty")} />
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("staffRankingTitle")}</h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          {t("staffRankingPending")}
        </p>
      </section>
    </div>
  );
}
