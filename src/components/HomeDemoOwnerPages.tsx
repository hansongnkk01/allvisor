"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/PageHeader";
import {
  PERFORMANCE_RANGES,
  type PerformanceRange,
} from "@/lib/performance-range";
import { RevenueTrendChart } from "@/components/dashboards/RevenueTrendChart";
import { staffRoleLabel } from "@/lib/roles";
import { vocabLabels } from "@/lib/niches";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { AdminInsights } from "@/lib/dashboard-data";
import type { Niche } from "@/lib/types";

/**
 * Owner-only pages in the homepage demo. They mirror the real /team, /performance,
 * /cashflow and /marketing pages so the preview never shows a dead link.
 */

const DEMO_MEMBERS = [
  { id: "m1", name: "Nor Hafizah", role: "owner", jobTitle: null, joinedDaysAgo: 640 },
  { id: "m2", name: "Farah Iman", role: "manager", jobTitle: "Floor manager", joinedDaysAgo: 410 },
  { id: "m3", name: "Danial Hakim", role: "supervisor", jobTitle: "Shift lead", joinedDaysAgo: 260 },
  { id: "m4", name: "Siti Aminah", role: "staff", jobTitle: "Counter", joinedDaysAgo: 120 },
  { id: "m5", name: "Kavitha R.", role: "staff", jobTitle: "Counter", joinedDaysAgo: 45 },
  { id: "m6", name: "Chong Wei", role: "admin", jobTitle: "Accounts", joinedDaysAgo: 30 },
];

const DEMO_OUTSTANDING = [
  { id: "o1", label: "INV-1041", customer: "Mei Ling", outstanding: 120, ageDays: 41 },
  { id: "o2", label: "INV-1036", customer: "Rajesh K.", outstanding: 500, ageDays: 34 },
  { id: "o3", label: "INV-1040", customer: "Lim Wei", outstanding: 60, ageDays: 12 },
  { id: "o4", label: "INV-1044", customer: "Aina Rahman", outstanding: 285, ageDays: 6 },
  { id: "o5", label: "INV-1046", customer: "Walk-in account", outstanding: 1495, ageDays: 2 },
];

function daysAgo(now: Date, days: number) {
  return new Date(now.getTime() - days * 86400000);
}

function TeamDemo({ insights, now }: { insights: AdminInsights; now: Date }) {
  const t = useTranslations("Owner");
  const locale = useLocale();

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("teamTitle")} subtitle={t("teamSubtitle")} />

      <section className="surface" style={{ padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("teamMembers")}</h2>
        <table className="table">
          <thead>
            <tr>
              <th>{t("teamMember")}</th>
              <th>{t("teamRole")}</th>
              <th>{t("teamJoined")}</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_MEMBERS.map((member) => (
              <tr key={member.id}>
                <td>
                  {member.name}
                  {member.jobTitle ? <div className="muted">{member.jobTitle}</div> : null}
                </td>
                <td>{staffRoleLabel(member.role)}</td>
                <td>{formatDate(daysAgo(now, member.joinedDaysAgo), locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("activityTitle")}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {t("activitySubtitle")}
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>{t("activityWho")}</th>
              <th>{t("activityWhat")}</th>
              <th>{t("activityWhen")}</th>
            </tr>
          </thead>
          <tbody>
            {insights.activity.map((log) => (
              <tr key={log.id}>
                <td>{log.actor}</td>
                <td>{log.summary}</td>
                <td>{formatDateTime(log.created_at, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/** Hour-of-day shape of a typical counter, used to fake the "today" chart. */
const DEMO_HOUR_SHAPE = [
  0, 0, 0, 0, 0, 0, 0, 2, 5, 9, 12, 14, 16, 13, 11, 12, 15, 18, 16, 11, 6, 3, 1, 0,
];

const RANGE_WEIGHT: Record<PerformanceRange, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

function PerformanceDemo({ insights }: { insights: AdminInsights }) {
  const t = useTranslations("Owner");
  const [range, setRange] = useState<PerformanceRange>("week");

  const trendTotal = insights.revenueTrend.reduce((sum, point) => sum + point.amount, 0);
  const perDay = insights.revenueTrend.length
    ? trendTotal / insights.revenueTrend.length
    : 0;
  const days = RANGE_WEIGHT[range];
  const collected = Math.round(perDay * days);
  const transactions = Math.max(1, Math.round(days * 9));
  const averageSale = collected / transactions;
  const scale = days / 30;
  const income = Math.round(insights.lastMonthIncome * scale);
  const expense = Math.round(insights.lastMonthExpense * scale);
  const profit = income - expense;
  const margin = income > 0 ? Math.round((profit / income) * 100) : 0;

  let points: { day: string; label: string; amount: number }[];
  if (range === "day") {
    const shapeTotal = DEMO_HOUR_SHAPE.reduce((sum, value) => sum + value, 0);
    points = DEMO_HOUR_SHAPE.map((weight, hour) => ({
      day: `h${hour}`,
      label: String(hour).padStart(2, "0"),
      amount: Math.round((perDay * weight) / shapeTotal),
    }));
  } else if (range === "year") {
    points = Array.from({ length: 12 }, (_, index) => ({
      day: `m${index}`,
      label: String(index + 1).padStart(2, "0"),
      amount: Math.round(perDay * 30 * (0.82 + ((index * 7) % 11) / 26)),
    }));
  } else {
    const source = insights.revenueTrend;
    const wanted = range === "week" ? 7 : source.length;
    points = source.slice(-wanted).map((point) => ({
      day: point.day,
      label: point.day.slice(8),
      amount: point.amount,
    }));
  }
  const busiest = points.reduce(
    (best, point) => (point.amount > best.amount ? point : best),
    points[0]
  );

  const rangeLabels: Record<PerformanceRange, string> = {
    day: t("rangeDay"),
    week: t("rangeWeek"),
    month: t("rangeMonth"),
    year: t("rangeYear"),
  };

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("performanceTitle")} subtitle={t("performanceSubtitle")} />

      <div className="surface" style={{ padding: "0.9rem 1.1rem" }}>
        <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {t("rangeFilter")}:
          </span>
          {PERFORMANCE_RANGES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={range === option ? "btn btn-primary" : "btn btn-ghost"}
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
            >
              {rangeLabels[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="fluid-grid-kpi">
        <div className="surface kpi">
          <div className="kpi-label">{t("collectedLabel")}</div>
          <div className="kpi-value">{formatCurrency(collected)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("transactionsLabel")}</div>
          <div className="kpi-value">{transactions}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("averageSaleLabel")}</div>
          <div className="kpi-value">{formatCurrency(averageSale)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("newCustomersLabel")}</div>
          <div className="kpi-value">{Math.max(1, Math.round(days * 1.4))}</div>
        </div>
      </div>

      <div className="fluid-grid-kpi">
        <div className="surface kpi">
          <div className="kpi-label">{t("incomeLabel")}</div>
          <div className="kpi-value">{formatCurrency(income)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("expenseLabel")}</div>
          <div className="kpi-value">{formatCurrency(expense)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("profitLabel")}</div>
          <div className="kpi-value">{formatCurrency(profit)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("marginLabel")}</div>
          <div className="kpi-value">{margin}%</div>
        </div>
      </div>

      <div className="fluid-grid-kpi">
        <div className="surface kpi">
          <div className="kpi-label">{t("invoicesRaisedLabel")}</div>
          <div className="kpi-value">{Math.max(1, Math.round(days * 8))}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("invoicedValueLabel")}</div>
          <div className="kpi-value">{formatCurrency(Math.round(collected * 1.12))}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">
            {range === "day" ? t("busiestHourLabel") : t("bestBucketLabel")}
          </div>
          <div className="kpi-value">{busiest?.label || "—"}</div>
        </div>
      </div>

      <section className="surface" style={{ padding: "1rem" }}>
        <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>{t("revenueTrendTitle")}</h2>
        <RevenueTrendChart points={points} empty={t("trendEmpty")} />
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

const DEMO_EXPENSE_MIX = [
  { category: "Stock purchase", amount: 2480 },
  { category: "Salary", amount: 1200 },
  { category: "Rent", amount: 550 },
  { category: "Utilities", amount: 250 },
];

function MoneyDemo({ insights, now }: { insights: AdminInsights; now: Date }) {
  const t = useTranslations("Owner");
  const tAcc = useTranslations("Accounting");
  const locale = useLocale();
  const income = insights.lastMonthIncome;
  const expense = insights.lastMonthExpense;
  const profit = income - expense;
  const margin = income > 0 ? Math.round((profit / income) * 100) : 0;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("moneyTitle")} subtitle={t("moneySubtitle")} />

      <div className="fluid-grid-kpi">
        <div className="surface kpi">
          <div className="kpi-label">{tAcc("income")}</div>
          <div className="kpi-value">{formatCurrency(income)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{tAcc("expense")}</div>
          <div className="kpi-value">{formatCurrency(expense)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{tAcc("profit")}</div>
          <div className="kpi-value">{formatCurrency(profit)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("marginLabel")}</div>
          <div className="kpi-value">{margin}%</div>
        </div>
      </div>

      <div className="fluid-grid-kpi">
        <div className="surface kpi">
          <div className="kpi-label">{t("receivablesCurrent")}</div>
          <div className="kpi-value">{formatCurrency(insights.receivablesCurrent)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("receivablesOverdue")}</div>
          <div className="kpi-value">{formatCurrency(insights.receivablesOverdue)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("overdueCount")}</div>
          <div className="kpi-value">{insights.receivablesOverdueCount}</div>
        </div>
      </div>

      <section className="surface" style={{ padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("expenseByCategoryTitle")}</h2>
        <table className="table">
          <thead>
            <tr>
              <th>{tAcc("category")}</th>
              <th>{tAcc("amount")}</th>
              <th>{t("shareLabel")}</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_EXPENSE_MIX.map((row) => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>{formatCurrency(row.amount)}</td>
                <td>{Math.round((row.amount / expense) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>{t("oldestOutstanding")}</h2>
          <button type="button" className="btn btn-soft" disabled>
            {t("openInvoices")}
          </button>
        </div>
        <p className="muted">{t("overdueHint", { days: insights.overdueAfterDays })}</p>
        <table className="table">
          <thead>
            <tr>
              <th>{t("invoiceLabel")}</th>
              <th>{t("customerLabel")}</th>
              <th>{t("raisedOn")}</th>
              <th>{t("outstanding")}</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_OUTSTANDING.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.label}
                  {row.ageDays > insights.overdueAfterDays ? (
                    <span className="badge" style={{ marginLeft: "0.4rem" }}>
                      {t("overdueBadge")}
                    </span>
                  ) : null}
                </td>
                <td>{row.customer}</td>
                <td>{formatDate(daysAgo(now, row.ageDays), locale)}</td>
                <td>{formatCurrency(row.outstanding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function MarketingDemo({ insights, niche }: { insights: AdminInsights; niche: Niche }) {
  const t = useTranslations("Owner");
  const locale = useLocale();
  const V = vocabLabels(niche, locale);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title={t("marketingTitle")}
        subtitle={t("marketingSubtitle", { business: V.business })}
      />

      <div className="fluid-grid">
        {insights.marketing.map((play) => (
          <section key={play.id} className="surface" style={{ padding: "1rem" }}>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>{play.title}</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              {play.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

export function HomeDemoOwnerPage({
  view,
  niche,
  insights,
  now,
}: {
  view: string;
  niche: Niche;
  insights: AdminInsights;
  now: Date;
}) {
  if (view === "performance") return <PerformanceDemo insights={insights} />;
  if (view === "money" || view === "cashflow") return <MoneyDemo insights={insights} now={now} />;
  if (view === "marketing") return <MarketingDemo insights={insights} niche={niche} />;
  return <TeamDemo insights={insights} now={now} />;
}
