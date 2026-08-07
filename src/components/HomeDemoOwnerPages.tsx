"use client";

import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/PageHeader";
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

function PerformanceDemo({ insights }: { insights: AdminInsights }) {
  const t = useTranslations("Owner");
  const trendTotal = insights.revenueTrend.reduce((sum, point) => sum + point.amount, 0);
  const income = insights.lastMonthIncome;
  const expense = insights.lastMonthExpense;

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
        <RevenueTrendChart points={insights.revenueTrend} empty={t("trendEmpty")} />
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

function CashflowDemo({ insights, now }: { insights: AdminInsights; now: Date }) {
  const t = useTranslations("Owner");
  const locale = useLocale();
  const net = insights.lastMonthIncome - insights.lastMonthExpense;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("cashflowTitle")} subtitle={t("cashflowSubtitle")} />

      <div className="fluid-grid">
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
        <div className="surface kpi">
          <div className="kpi-label">{t("netThisMonth")}</div>
          <div className="kpi-value">{formatCurrency(net)}</div>
        </div>
      </div>

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
  if (view === "cashflow") return <CashflowDemo insights={insights} now={now} />;
  if (view === "marketing") return <MarketingDemo insights={insights} niche={niche} />;
  return <TeamDemo insights={insights} now={now} />;
}
