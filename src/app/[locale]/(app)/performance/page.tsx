import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireOwner } from "@/lib/require-owner";
import { PageHeader } from "@/components/PageHeader";
import { RevenueTrendChart } from "@/components/dashboards/RevenueTrendChart";
import { formatCurrency } from "@/lib/utils";
import { formatDayKeyMY } from "@/lib/datetime-my";
import {
  PERFORMANCE_RANGES,
  deltaPercent,
  isPerformanceRange,
  performanceWindow,
  type PerformanceRange,
} from "@/lib/performance-range";

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="surface kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {hint ? (
        <div className="muted" style={{ fontSize: "0.75rem" }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export default async function PerformancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Owner");
  const { supabase, organization } = await requireOwner(locale);
  const orgId = organization.id;

  const range: PerformanceRange = isPerformanceRange(sp.range) ? sp.range : "week";
  const window = performanceWindow(range);
  const startIso = window.start.toISOString();
  const endIso = window.end.toISOString();
  const prevStartIso = window.prevStart.toISOString();
  const startDay = formatDayKeyMY(window.start);
  const endDay = formatDayKeyMY(window.end);
  const prevStartDay = formatDayKeyMY(window.prevStart);

  const [{ data: payments }, { data: ledger }, { data: invoices }, { data: customers }] =
    await Promise.all([
      supabase
        .from("payments")
        .select("amount, paid_at")
        .eq("organization_id", orgId)
        .gte("paid_at", prevStartIso)
        .lte("paid_at", endIso),
      supabase
        .from("ledger_entries")
        .select("entry_type, amount, entry_date")
        .eq("organization_id", orgId)
        .gte("entry_date", prevStartDay)
        .lte("entry_date", endDay),
      supabase
        .from("invoices")
        .select("id, total, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", prevStartIso)
        .lte("created_at", endIso),
      supabase
        .from("customers")
        .select("id, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", startIso)
        .lte("created_at", endIso),
    ]);

  const inWindow = (iso: string | null | undefined) => {
    if (!iso) return false;
    const time = new Date(iso).getTime();
    return time >= window.start.getTime() && time <= window.end.getTime();
  };

  const currentPayments = (payments || []).filter((p) => inWindow(p.paid_at as string));
  const previousPayments = (payments || []).filter((p) => !inWindow(p.paid_at as string));
  const collected = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const collectedPrev = previousPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const transactions = currentPayments.length;
  const averageSale = transactions > 0 ? collected / transactions : 0;

  const currentLedger = (ledger || []).filter((entry) => {
    const day = String(entry.entry_date);
    return day >= startDay && day <= endDay;
  });
  const income = currentLedger
    .filter((entry) => entry.entry_type === "income")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
  const expense = currentLedger
    .filter((entry) => entry.entry_type === "expense")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
  const profit = income - expense;
  const margin = income > 0 ? Math.round((profit / income) * 100) : 0;

  const currentInvoices = (invoices || []).filter((inv) => inWindow(inv.created_at as string));
  const invoicedValue = currentInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

  const trend = window.buckets.map((bucket) => {
    const amount = currentPayments
      .filter((p) => {
        const time = new Date(p.paid_at as string).getTime();
        return time >= bucket.start.getTime() && time <= bucket.end.getTime();
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { day: bucket.key, label: bucket.label, amount };
  });
  const busiest = trend.reduce(
    (best, point) => (point.amount > best.amount ? point : best),
    trend[0] || { day: "", label: "—", amount: 0 }
  );

  const rangeLabels: Record<PerformanceRange, string> = {
    day: t("rangeDay"),
    week: t("rangeWeek"),
    month: t("rangeMonth"),
    year: t("rangeYear"),
  };

  const collectedDelta = deltaPercent(collected, collectedPrev);
  const deltaHint =
    collectedDelta === null
      ? null
      : t("vsPrevious", { value: `${collectedDelta > 0 ? "+" : ""}${collectedDelta}%` });

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("performanceTitle")} subtitle={t("performanceSubtitle")} />

      <div className="surface" style={{ padding: "0.9rem 1.1rem" }}>
        <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {t("rangeFilter")}:
          </span>
          {PERFORMANCE_RANGES.map((option) => (
            <Link
              key={option}
              href={`/performance?range=${option}`}
              className={range === option ? "btn btn-primary" : "btn btn-ghost"}
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
            >
              {rangeLabels[option]}
            </Link>
          ))}
        </div>
      </div>

      <div className="fluid-grid-kpi">
        <Kpi label={t("collectedLabel")} value={formatCurrency(collected)} hint={deltaHint} />
        <Kpi label={t("transactionsLabel")} value={String(transactions)} />
        <Kpi label={t("averageSaleLabel")} value={formatCurrency(averageSale)} />
        <Kpi label={t("newCustomersLabel")} value={String((customers || []).length)} />
      </div>

      <div className="fluid-grid-kpi">
        <Kpi label={t("incomeLabel")} value={formatCurrency(income)} />
        <Kpi label={t("expenseLabel")} value={formatCurrency(expense)} />
        <Kpi label={t("profitLabel")} value={formatCurrency(profit)} />
        <Kpi label={t("marginLabel")} value={`${margin}%`} />
      </div>

      <div className="fluid-grid-kpi">
        <Kpi label={t("invoicesRaisedLabel")} value={String(currentInvoices.length)} />
        <Kpi label={t("invoicedValueLabel")} value={formatCurrency(invoicedValue)} />
        <Kpi
          label={range === "day" ? t("busiestHourLabel") : t("bestBucketLabel")}
          value={busiest.amount > 0 ? busiest.label : "—"}
          hint={busiest.amount > 0 ? formatCurrency(busiest.amount) : null}
        />
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
