import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireOwner } from "@/lib/require-owner";
import { PageHeader } from "@/components/PageHeader";
import { RevenueTrendChart } from "@/components/dashboards/RevenueTrendChart";
import { ScoreBar } from "@/components/dashboards/ScoreBar";
import { BranchScorecard, type BranchScoreRow } from "@/components/BranchScorecard";
import { formatCurrency } from "@/lib/utils";
import { dayBoundsMY, formatDayKeyMY } from "@/lib/datetime-my";
import { getNicheVocab, hasCapability, vocabLabels } from "@/lib/niches";
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
  const tAdmin = await getTranslations("Admin");
  const { supabase, organization, membership, profile } = await requireOwner(locale);
  const orgId = organization.id;
  const userId = membership.user_id || profile.id;

  const range: PerformanceRange = isPerformanceRange(sp.range) ? sp.range : "week";
  const window = performanceWindow(range);
  const startIso = window.start.toISOString();
  const endIso = window.end.toISOString();
  const prevStartIso = window.prevStart.toISOString();
  const startDay = formatDayKeyMY(window.start);
  const endDay = formatDayKeyMY(window.end);
  const prevStartDay = formatDayKeyMY(window.prevStart);

  const [
    { data: payments },
    { data: ledger },
    { data: invoices },
    { data: customers },
    { data: scores },
    { data: members },
  ] = await Promise.all([
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
    supabase
      .from("staff_scores")
      .select("user_id, score, sales_amount, transaction_count")
      .eq("organization_id", orgId)
      .gte("score_date", startDay)
      .lte("score_date", endDay),
    supabase
      .from("memberships")
      .select("user_id, profiles(full_name, email)")
      .eq("organization_id", orgId),
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

  const nameByUser = new Map<string, string>(
    (members || []).map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return [String(m.user_id), profile?.full_name || profile?.email || "—"];
    })
  );
  const scoreByUser = new Map<
    string,
    { days: number; total: number; sales: number; transactions: number }
  >();
  for (const row of scores || []) {
    const key = String(row.user_id);
    const entry = scoreByUser.get(key) || { days: 0, total: 0, sales: 0, transactions: 0 };
    entry.days += 1;
    entry.total += Number(row.score || 0);
    entry.sales += Number(row.sales_amount || 0);
    entry.transactions += Number(row.transaction_count || 0);
    scoreByUser.set(key, entry);
  }
  const staffRanking = [...scoreByUser.entries()]
    .map(([userId, entry]) => ({
      userId,
      name: nameByUser.get(userId) || "—",
      percent: Math.round(entry.total / Math.max(1, entry.days)),
      sales: entry.sales,
      transactions: entry.transactions,
    }))
    .sort((a, b) => b.percent - a.percent);

  const collectedDelta = deltaPercent(collected, collectedPrev);
  const deltaHint =
    collectedDelta === null
      ? null
      : t("vsPrevious", { value: `${collectedDelta > 0 ? "+" : ""}${collectedDelta}%` });

  // Multi-branch scorecard (today + month-to-date) across every branch this
  // owner belongs to — moved here from the Admin tab.
  let branchScoreRows: BranchScoreRow[] = [];
  const { data: myMemberships } = await supabase
    .from("memberships")
    .select("organization_id, organizations(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  const branchList = (myMemberships || []).map((row) => {
    const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
    return { id: String(row.organization_id), name: String((org as { name?: string } | null)?.name || "Branch") };
  });

  if (branchList.length > 1 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const now = new Date();
    const { start: todayStart, end: todayEnd } = dayBoundsMY(now);
    const monthStart = `${formatDayKeyMY(now).slice(0, 7)}-01`;
    const monthStartIso = new Date(`${monthStart}T00:00:00+08:00`).toISOString();
    const isClinic = hasCapability(organization.niche, "appointments") || hasCapability(organization.niche, "allergies");
    const isRetail = hasCapability(organization.niche, "pos");

    branchScoreRows = await Promise.all(
      branchList.map(async (b) => {
        const [
          { data: paidToday },
          { data: paidMonth },
          { data: unpaidRows },
          { count: apptToday },
          { count: noShowToday },
          { data: products },
        ] = await Promise.all([
          admin
            .from("payments")
            .select("amount")
            .eq("organization_id", b.id)
            .gte("paid_at", todayStart.toISOString())
            .lte("paid_at", todayEnd.toISOString()),
          admin
            .from("payments")
            .select("amount")
            .eq("organization_id", b.id)
            .gte("paid_at", monthStartIso)
            .lte("paid_at", todayEnd.toISOString()),
          admin
            .from("invoices")
            .select("total, amount_paid")
            .eq("organization_id", b.id)
            .in("status", ["unpaid", "partial"]),
          isClinic
            ? admin
                .from("appointments")
                .select("id", { count: "exact", head: true })
                .eq("organization_id", b.id)
                .gte("starts_at", todayStart.toISOString())
                .lte("starts_at", todayEnd.toISOString())
            : Promise.resolve({ count: 0 }),
          isClinic
            ? admin
                .from("appointments")
                .select("id", { count: "exact", head: true })
                .eq("organization_id", b.id)
                .eq("status", "no_show")
                .gte("starts_at", todayStart.toISOString())
                .lte("starts_at", todayEnd.toISOString())
            : Promise.resolve({ count: 0 }),
          isRetail
            ? admin
                .from("products")
                .select("quantity, low_stock_threshold")
                .eq("organization_id", b.id)
                .eq("is_active", true)
            : Promise.resolve({ data: [] as { quantity: number; low_stock_threshold: number | null }[] }),
        ]);

        const unpaidTotal = (unpaidRows || []).reduce(
          (sum, inv) => sum + Math.max(0, Number(inv.total) - Number(inv.amount_paid || 0)),
          0
        );
        const lowStockCount = (products || []).filter(
          (p) => Number(p.quantity) <= Number(p.low_stock_threshold ?? 5)
        ).length;

        return {
          id: b.id,
          name: b.name,
          isCurrent: b.id === orgId,
          incomeToday: (paidToday || []).reduce((s, p) => s + Number(p.amount), 0),
          incomeMonth: (paidMonth || []).reduce((s, p) => s + Number(p.amount), 0),
          unpaidCount: unpaidRows?.length || 0,
          unpaidTotal,
          appointmentsToday: apptToday || 0,
          noShowToday: noShowToday || 0,
          txnToday: paidToday?.length || 0,
          lowStockCount,
        };
      })
    );
  }
  const vocab = getNicheVocab(organization.niche);
  const V = vocabLabels(organization.niche, locale);

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
        {staffRanking.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>{t("teamMember")}</th>
                <th>{t("scoreColumn")}</th>
                <th>{t("salesColumn")}</th>
                <th>{t("transactionsLabel")}</th>
              </tr>
            </thead>
            <tbody>
              {staffRanking.map((row) => (
                <tr key={row.userId}>
                  <td>{row.name}</td>
                  <td style={{ minWidth: 140 }}>
                    <ScoreBar percent={row.percent} />
                  </td>
                  <td>{formatCurrency(row.sales)}</td>
                  <td>{row.transactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted" style={{ marginBottom: 0 }}>
            {t("staffRankingPending")}
          </p>
        )}
      </section>

      {branchScoreRows.length > 1 ? (
        <BranchScorecard
          variant={vocab.scorecard === "pos" ? "retail" : "clinic"}
          title={tAdmin("scorecardTitle")}
          subtitle={V.scorecardHint}
          rows={branchScoreRows}
          labels={{
            branch: tAdmin("scorecardBranch"),
            incomeToday: tAdmin("scorecardIncomeToday"),
            incomeMonth: tAdmin("scorecardIncomeMonth"),
            unpaid: tAdmin("scorecardUnpaid"),
            appointmentsToday: tAdmin("scorecardApptsToday"),
            noShow: tAdmin("scorecardNoShow"),
            thisClinic: V.thisBranch,
            txnToday: tAdmin("scorecardTxnToday"),
            lowStock: tAdmin("scorecardLowStock"),
          }}
        />
      ) : null}
    </div>
  );
}
