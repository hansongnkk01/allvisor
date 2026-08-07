"use client";

import { Link } from "@/i18n/navigation";
import { useTransition } from "react";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency } from "@/lib/utils";
import type { SharedDashboardData, DashboardMode } from "@/lib/dashboard-data";
import { ActionForm } from "@/components/ActionForm";
import {
  generateAiBriefingAction,
  recomputeStaffScoresAction,
  runSmartInventoryScanAction,
  sendOwnerChatAction,
} from "@/app/ops-brain-actions";

export type AdminDashLabels = {
  welcome: string;
  subtitle: string;
  /** Oversight header strip */
  monthRevenue: string;
  vsLastMonth: string;
  outstanding: string;
  overdue: string;
  teamSize: string;
  branches: string;
  openAlerts: string;
  /** Sections */
  revenueTrend: string;
  staffRanking: string;
  noScores: string;
  recomputeScores: string;
  staffActivity: string;
  noActivity: string;
  alertsInbox: string;
  noAlerts: string;
  reviewAlerts: string;
  scanInventory: string;
  cashflowPlanning: string;
  income: string;
  expense: string;
  net: string;
  runway: string;
  openAccounting: string;
  marketing: string;
  briefing: string;
  generateBriefing: string;
  delegatedTasks: string;
  noTasks: string;
  manageTasks: string;
  adminTools: string;
  adminZone: string;
  addBranch: string;
  lhdn: string;
  teamPage: string;
  performancePage: string;
  chatTitle: string;
  chatPlaceholder: string;
  chatSend: string;
  demoNotice: string;
};

export function AdminDashboardView({
  mode,
  data,
  labels,
  locale,
}: {
  mode: DashboardMode;
  data: SharedDashboardData;
  labels: AdminDashLabels;
  locale: string;
}) {
  const demo = mode === "demo";
  const live = !demo && data.opsBrainEnabled;
  const [pending, startTransition] = useTransition();

  const insights = data.adminInsights;
  const monthIncome = insights?.monthIncome ?? data.kpi.income;
  const monthExpense = insights?.monthExpense ?? data.kpi.expense;
  const net = monthIncome - monthExpense;
  const prev = insights?.prevMonthIncome ?? 0;
  const deltaPct = prev > 0 ? ((monthIncome - prev) / prev) * 100 : null;
  const receivables = insights?.receivables ?? { current: 0, overdue: 0, overdueCount: 0 };
  const highAlerts = data.dbAlerts.filter((a) => a.severity === "high").length;
  const trend = insights?.salesTrend ?? [];
  const peak = Math.max(1, ...trend.map((t) => t.amount));
  const burnPerDay = monthExpense / 30;
  const runwayDays = burnPerDay > 0 ? Math.max(0, Math.round(net / burnPerDay)) : null;

  return (
    <div
      className="stack dash-admin"
      data-dash-mode={mode}
      data-dash-role="admin"
      style={{ gap: "1.1rem" }}
    >
      <PageHeader title={`${labels.welcome}, ${data.welcomeName}`} subtitle={labels.subtitle} />

      {demo ? <div className="callout">{labels.demoNotice}</div> : null}

      <section className="dash-admin-strip">
        <div className="surface dash-stat">
          <span className="kpi-label">{labels.monthRevenue}</span>
          <strong className="kpi-value">{formatCurrency(monthIncome)}</strong>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {labels.vsLastMonth}:{" "}
            {deltaPct === null ? "—" : `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`}
          </span>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">{labels.outstanding}</span>
          <strong className="kpi-value">
            {formatCurrency(receivables.current + receivables.overdue)}
          </strong>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {labels.overdue}: {formatCurrency(receivables.overdue)} ({receivables.overdueCount})
          </span>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">{labels.teamSize}</span>
          <strong className="kpi-value">{insights?.teamSize ?? data.staffScores.length}</strong>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {labels.branches}: {insights?.branchCount ?? 0}
          </span>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">{labels.openAlerts}</span>
          <strong className="kpi-value" style={{ color: highAlerts ? "var(--danger)" : undefined }}>
            {data.dbAlerts.length}
          </strong>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            high: {highAlerts}
          </span>
        </div>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <strong>{labels.revenueTrend}</strong>
        {trend.length ? (
          <div className="dash-trend">
            {trend.map((point) => (
              <div key={point.day} className="dash-trend-col" title={formatCurrency(point.amount)}>
                <div
                  className="dash-trend-bar"
                  style={{ height: `${Math.round((point.amount / peak) * 100)}%` }}
                />
                <span className="dash-trend-label">{point.day.slice(5)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">—</p>
        )}
      </section>

      <div className="fluid-grid">
        <section className="surface" style={{ padding: "1rem" }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
            <strong>{labels.staffRanking}</strong>
            {live ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={pending}
                onClick={() => startTransition(async () => void (await recomputeStaffScoresAction()))}
              >
                {labels.recomputeScores}
              </button>
            ) : null}
          </div>
          {!data.staffScores.length ? (
            <p className="muted">{labels.noScores}</p>
          ) : (
            <table className="table" style={{ marginTop: 10 }}>
              <tbody>
                {data.staffScores.map((s, i) => (
                  <tr key={s.userId}>
                    <td style={{ width: 28 }}>{i + 1}</td>
                    <td>
                      <strong>{s.name}</strong>
                      <div className="muted" style={{ fontSize: ".78rem" }}>
                        {s.transactionCount} txn · refund {s.refundRate.toFixed(1)}%
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{s.score}</strong>
                      <div className="muted" style={{ fontSize: ".78rem" }}>
                        {formatCurrency(s.salesAmount)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!demo ? (
            <Link href="/team" className="btn btn-ghost" style={{ marginTop: 10 }}>
              {labels.teamPage}
            </Link>
          ) : null}
        </section>

        <section className="surface" style={{ padding: "1rem" }}>
          <strong>{labels.staffActivity}</strong>
          <ol className="dash-timeline">
            {(insights?.staffActivity?.length
              ? insights.staffActivity
              : data.activitySummary.map((line) => ({ actor: "", summary: line, at: "" }))
            ).length ? (
              (insights?.staffActivity?.length
                ? insights.staffActivity
                : data.activitySummary.map((line) => ({ actor: "", summary: line, at: "" }))
              ).map((entry, i) => (
                <li key={i}>
                  <span className="dash-timeline-dot" />
                  <div>
                    {entry.actor ? <strong>{entry.actor}</strong> : null}{" "}
                    <span>{entry.summary}</span>
                    {entry.at ? (
                      <div className="muted" style={{ fontSize: ".75rem" }}>
                        {new Date(entry.at).toLocaleString(locale === "ms" ? "ms-MY" : "en-MY")}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))
            ) : (
              <li className="muted">{labels.noActivity}</li>
            )}
          </ol>
        </section>
      </div>

      <section className="surface" style={{ padding: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <strong>{labels.alertsInbox}</strong>
          <div className="row" style={{ gap: 8 }}>
            {live ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={pending}
                onClick={() => startTransition(async () => void (await runSmartInventoryScanAction()))}
              >
                {labels.scanInventory}
              </button>
            ) : null}
            {!demo ? (
              <Link href="/alerts" className="btn btn-soft">
                {labels.reviewAlerts}
              </Link>
            ) : null}
          </div>
        </div>
        {data.dbAlerts.length ? (
          <ul className="dash-alert-list">
            {data.dbAlerts.slice(0, 6).map((a) => (
              <li key={a.id} data-severity={a.severity}>
                <span className="badge">{a.severity}</span>
                <div>
                  <strong>{a.title}</strong>
                  <div className="muted" style={{ fontSize: ".8rem" }}>
                    {a.message}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{labels.noAlerts}</p>
        )}
      </section>

      <div className="fluid-grid">
        <section className="surface" style={{ padding: "1rem" }}>
          <strong>{labels.cashflowPlanning}</strong>
          <dl className="dash-figures">
            <div>
              <dt>{labels.income}</dt>
              <dd>{formatCurrency(monthIncome)}</dd>
            </div>
            <div>
              <dt>{labels.expense}</dt>
              <dd>{formatCurrency(monthExpense)}</dd>
            </div>
            <div>
              <dt>{labels.net}</dt>
              <dd style={{ color: net >= 0 ? "var(--success, #16a34a)" : "var(--danger)" }}>
                {formatCurrency(net)}
              </dd>
            </div>
            <div>
              <dt>{labels.runway}</dt>
              <dd>{runwayDays === null ? "—" : `${runwayDays}d`}</dd>
            </div>
          </dl>
          {!demo ? (
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <Link href="/cashflow" className="btn btn-soft">
                {labels.cashflowPlanning}
              </Link>
              <Link href="/accounting" className="btn btn-ghost">
                {labels.openAccounting}
              </Link>
            </div>
          ) : null}
        </section>

        <section className="surface" style={{ padding: "1rem" }}>
          <strong>{labels.marketing}</strong>
          <ul style={{ margin: "0.6rem 0 0", paddingLeft: "1.1rem", lineHeight: 1.7 }}>
            {(insights?.marketingIdeas ?? data.marketingIdeas).map((idea, i) => (
              <li key={i}>{idea}</li>
            ))}
          </ul>
          {!demo ? (
            <Link href="/marketing" className="btn btn-ghost" style={{ marginTop: 10 }}>
              {labels.marketing}
            </Link>
          ) : null}
        </section>
      </div>

      <section className="surface" style={{ padding: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <strong>{labels.briefing}</strong>
          {live ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("locale", locale);
                  await generateAiBriefingAction(fd);
                })
              }
            >
              {labels.generateBriefing}
            </button>
          ) : null}
        </div>
        <p style={{ marginTop: 10, lineHeight: 1.6 }}>{data.briefing || "—"}</p>
      </section>

      <div className="fluid-grid">
        <section className="surface" style={{ padding: "1rem" }}>
          <strong>{labels.delegatedTasks}</strong>
          {data.tasks.length ? (
            <ul style={{ margin: "0.6rem 0 0", paddingLeft: "1.1rem", lineHeight: 1.7 }}>
              {data.tasks.slice(0, 6).map((t) => (
                <li key={t.id}>
                  {t.title} <span className="badge">{t.status}</span>
                  {t.assignedToName ? (
                    <span className="muted"> · {t.assignedToName}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{labels.noTasks}</p>
          )}
          {!demo ? (
            <Link href="/tasks" className="btn btn-ghost" style={{ marginTop: 10 }}>
              {labels.manageTasks}
            </Link>
          ) : null}
        </section>

        <section className="surface" style={{ padding: "1rem" }}>
          <strong>{labels.adminTools}</strong>
          <div className="dash-admin-links">
            {demo ? (
              <>
                <span className="btn btn-ghost" aria-disabled>
                  {labels.adminZone}
                </span>
                <span className="btn btn-ghost" aria-disabled>
                  {labels.addBranch}
                </span>
                <span className="btn btn-ghost" aria-disabled>
                  {labels.performancePage}
                </span>
                <span className="btn btn-ghost" aria-disabled>
                  {labels.lhdn}
                </span>
              </>
            ) : (
              <>
                <Link href="/admin" className="btn btn-soft">
                  {labels.adminZone}
                </Link>
                <Link href="/admin#branches" className="btn btn-ghost">
                  {labels.addBranch}
                </Link>
                <Link href="/performance" className="btn btn-ghost">
                  {labels.performancePage}
                </Link>
                <Link href="/lhdn" className="btn btn-ghost">
                  {labels.lhdn}
                </Link>
              </>
            )}
          </div>
        </section>
      </div>

      {live ? (
        <section className="surface" style={{ padding: "1rem" }}>
          <strong>{labels.chatTitle}</strong>
          <ActionForm action={sendOwnerChatAction} className="stack" style={{ marginTop: 10 }}>
            <input type="hidden" name="locale" value={locale} />
            <textarea
              name="message"
              className="input"
              rows={3}
              required
              placeholder={labels.chatPlaceholder}
            />
            <button type="submit" className="btn btn-primary">
              {labels.chatSend}
            </button>
          </ActionForm>
        </section>
      ) : null}
    </div>
  );
}
