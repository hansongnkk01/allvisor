"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RevenueTrendChart } from "@/components/dashboards/RevenueTrendChart";
import { NicheCardGrid } from "@/components/dashboards/NicheCardGrid";
import { AdminAlertsInboxCard, AdminAiBriefingCard, AdminStaffRankingCard, AdminTasksCard } from "@/components/dashboards/OpsCards";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { AdminInsights, SharedDashboardData } from "@/lib/dashboard-data";

export type AdminCardProps = {
  data: SharedDashboardData;
  insights: AdminInsights;
};

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="surface" style={{ padding: "1rem" }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem" }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: "0.75rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>{value}</div>
      {hint ? (
        <div className="muted" style={{ fontSize: "0.75rem" }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function deltaHint(current: number, previous: number, t: (key: string) => string) {
  if (previous <= 0) return undefined;
  const percent = Math.round(((current - previous) / previous) * 100);
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent}% ${t("vsLastMonth")}`;
}

export function AdminHeadlineCard({ data, insights }: AdminCardProps) {
  const t = useTranslations("Owner");
  const { kpis } = data;
  const profit = kpis.incomeMonth - kpis.expenseMonth;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "0.65rem",
      }}
    >
      <div className="surface kpi" style={{ margin: 0 }}>
        <div className="kpi-label">{t("todayCollected")}</div>
        <div className="kpi-value">{formatCurrency(kpis.salesToday)}</div>
      </div>
      <div className="surface kpi" style={{ margin: 0 }}>
        <div className="kpi-label">{t("monthProfit")}</div>
        <div className="kpi-value">{formatCurrency(profit)}</div>
      </div>
      <div className="surface kpi" style={{ margin: 0 }}>
        <div className="kpi-label">{t("receivablesOverdue")}</div>
        <div className="kpi-value">{formatCurrency(insights.receivablesOverdue)}</div>
      </div>
      <div className="surface kpi" style={{ margin: 0 }}>
        <div className="kpi-label">{t("teamSize")}</div>
        <div className="kpi-value">{insights.teamSize}</div>
      </div>
    </div>
  );
}

export function AdminRevenueTrendCard({ insights }: AdminCardProps) {
  const t = useTranslations("Owner");
  const total = insights.revenueTrend.reduce((sum, point) => sum + point.amount, 0);

  return (
    <Card
      title={t("revenueTrendTitle")}
      action={<span className="muted">{`${t("revenue14")}: ${formatCurrency(total)}`}</span>}
    >
      <RevenueTrendChart points={insights.revenueTrend} empty={t("trendEmpty")} />
    </Card>
  );
}

export function AdminMonthPnlCard({ data, insights }: AdminCardProps) {
  const t = useTranslations("Owner");
  const { kpis } = data;
  const profit = kpis.incomeMonth - kpis.expenseMonth;
  const lastProfit = insights.lastMonthIncome - insights.lastMonthExpense;

  return (
    <Card
      title={t("monthPnlTitle")}
      action={
        <Link href="/money" className="btn btn-soft">
          {t("openMoney")}
        </Link>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "0.75rem",
        }}
      >
        <Stat
          label={t("monthIncome")}
          value={formatCurrency(kpis.incomeMonth)}
          hint={deltaHint(kpis.incomeMonth, insights.lastMonthIncome, t)}
        />
        <Stat
          label={t("monthExpense")}
          value={formatCurrency(kpis.expenseMonth)}
          hint={deltaHint(kpis.expenseMonth, insights.lastMonthExpense, t)}
        />
        <Stat
          label={t("monthProfit")}
          value={formatCurrency(profit)}
          hint={deltaHint(profit, lastProfit, t)}
        />
      </div>
    </Card>
  );
}

export function AdminReceivablesCard({ insights }: AdminCardProps) {
  const t = useTranslations("Owner");

  return (
    <Card
      title={t("receivablesTitle")}
      action={
        <Link href="/money" className="btn btn-soft">
          {t("openMoney")}
        </Link>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "0.75rem",
        }}
      >
        <Stat label={t("receivablesCurrent")} value={formatCurrency(insights.receivablesCurrent)} />
        <Stat label={t("receivablesOverdue")} value={formatCurrency(insights.receivablesOverdue)} />
        <Stat label={t("overdueCount")} value={String(insights.receivablesOverdueCount)} />
      </div>
      <p className="muted" style={{ marginBottom: 0 }}>
        {t("overdueHint", { days: insights.overdueAfterDays })}
      </p>
    </Card>
  );
}

export function AdminStaffActivityCard({ insights }: AdminCardProps) {
  const t = useTranslations("Owner");
  const locale = useLocale();

  return (
    <Card
      title={t("activityTitle")}
      action={
        <Link href="/team" className="btn btn-soft">
          {t("openTeam")}
        </Link>
      }
    >
      {insights.activity.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          {t("activityEmpty")}
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{t("activityWho")}</th>
              <th>{t("activityWhat")}</th>
              <th>{t("activityWhen")}</th>
            </tr>
          </thead>
          <tbody>
            {insights.activity.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.actor || "—"}</td>
                <td>{entry.summary}</td>
                <td>{formatDateTime(entry.created_at, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

export function AdminTeamBranchesCard({ insights }: AdminCardProps) {
  const t = useTranslations("Owner");

  return (
    <Card
      title={t("teamTitle")}
      action={
        <Link href="/team" className="btn btn-soft">
          {t("openTeam")}
        </Link>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "0.75rem",
        }}
      >
        <Stat label={t("teamSize")} value={String(insights.teamSize)} />
        <Stat label={t("branches")} value={String(insights.branchCount)} />
      </div>
    </Card>
  );
}

export function AdminLhdnCard({ data }: AdminCardProps) {
  const t = useTranslations("Owner");
  const { kpis } = data;
  const clear = kpis.lhdnPendingCount === 0 && kpis.lhdnRejectedCount === 0;

  return (
    <Card
      title={t("lhdnTitle")}
      action={
        <Link href="/lhdn" className="btn btn-soft">
          {t("openLhdn")}
        </Link>
      }
    >
      {clear ? (
        <p className="muted" style={{ margin: 0 }}>
          {t("lhdnAllClear")}
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <Stat label={t("lhdnPendingLabel")} value={String(kpis.lhdnPendingCount)} />
          <Stat label={t("lhdnRejectedLabel")} value={String(kpis.lhdnRejectedCount)} />
        </div>
      )}
    </Card>
  );
}

export function AdminMarketingCard({ insights }: AdminCardProps) {
  const t = useTranslations("Owner");

  return (
    <Card
      title={t("marketingCardTitle")}
      action={
        <Link href="/marketing" className="btn btn-soft">
          {t("seeAllMarketing")}
        </Link>
      }
    >
      <div className="fluid-grid">
        {insights.marketing.slice(0, 3).map((idea) => (
          <div key={idea.id}>
            <div style={{ fontWeight: 600 }}>{idea.title}</div>
            <p className="muted" style={{ margin: "0.25rem 0 0" }}>
              {idea.body}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Slot where the niche-specific oversight cards land, in registry order. */
export function AdminNicheGridCard({ data }: AdminCardProps) {
  return <NicheCardGrid cards={data.nicheCards} />;
}

export const ADMIN_CARD_COMPONENTS: Record<string, React.FC<AdminCardProps>> = {
  adminNicheGrid: AdminNicheGridCard,
  adminHeadline: AdminHeadlineCard,
  adminRevenueTrend: AdminRevenueTrendCard,
  adminMonthPnl: AdminMonthPnlCard,
  adminReceivables: AdminReceivablesCard,
  adminStaffActivity: AdminStaffActivityCard,
  adminTeamBranches: AdminTeamBranchesCard,
  adminLhdn: AdminLhdnCard,
  adminMarketing: AdminMarketingCard,
  adminAlertsInbox: AdminAlertsInboxCard,
  adminTasks: AdminTasksCard,
  adminStaffRanking: AdminStaffRankingCard,
  adminAiBriefing: AdminAiBriefingCard,
};
