"use client";

import { PageHeader } from "@/components/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { buildDemoSharedDashboard } from "@/lib/demo-role-dashboard";
import { buildMarketingPlays } from "@/lib/marketing-plays";
import type { Niche } from "@/lib/types";

/**
 * Demo versions of the admin-only pages. They reuse the same CSS classes as the
 * live pages so a layout change in globals.css moves both at once.
 */

export function TeamDemo({ niche, orgName }: { niche: Niche; orgName: string }) {
  const data = buildDemoSharedDashboard(niche, "admin");
  const activity = data.adminInsights?.staffActivity || [];
  const roster = [
    { name: "Siti", role: "manager", score: 91, sales: 3100, txn: 30, refund: 2 },
    { name: "Ahmad", role: "staff", score: 78, sales: 2400, txn: 22, refund: 12 },
    { name: "Faiz", role: "staff", score: 72, sales: 1850, txn: 19, refund: 5 },
  ];

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader title="Team & performance" subtitle={orgName} />
      <section className="surface" style={{ padding: "1rem" }}>
        <strong>Staff ranking (7d)</strong>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data">
            <thead>
              <tr>
                <th>#</th>
                <th>Staff</th>
                <th>Role</th>
                <th style={{ textAlign: "right" }}>Score</th>
                <th style={{ textAlign: "right" }}>Sales</th>
                <th style={{ textAlign: "right" }}>Txn</th>
                <th style={{ textAlign: "right" }}>Refund %</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((m, i) => (
                <tr key={m.name}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{m.name}</strong>
                  </td>
                  <td>{m.role}</td>
                  <td style={{ textAlign: "right" }}>{m.score}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(m.sales)}</td>
                  <td style={{ textAlign: "right" }}>{m.txn}</td>
                  <td style={{ textAlign: "right" }}>{m.refund.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <strong>Staff activity log</strong>
        <ol className="dash-timeline">
          {activity.map((a, i) => (
            <li key={i}>
              <span className="dash-timeline-dot" />
              <div>
                <strong>{a.actor}</strong> <span>{a.summary}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export function PerformanceDemo({ niche, orgName }: { niche: Niche; orgName: string }) {
  const data = buildDemoSharedDashboard(niche, "admin");
  const trend = data.adminInsights?.salesTrend || [];
  const peak = Math.max(1, ...trend.map((p) => p.amount));

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader title="Business performance" subtitle={orgName} />
      <section className="dash-admin-strip">
        <div className="surface dash-stat">
          <span className="kpi-label">Revenue (30d)</span>
          <strong className="kpi-value">{formatCurrency(38400)}</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Invoices (30d)</span>
          <strong className="kpi-value">146</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Average invoice</span>
          <strong className="kpi-value">{formatCurrency(263)}</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Collection rate</span>
          <strong className="kpi-value">88%</strong>
        </div>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <strong>Revenue — last 7 days</strong>
        <div className="dash-trend">
          {trend.map((p) => (
            <div key={p.day} className="dash-trend-col">
              <div
                className="dash-trend-bar"
                style={{ height: `${Math.round((p.amount / peak) * 100)}%` }}
              />
              <span className="dash-trend-label">{p.day.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <strong>Top sellers</strong>
        <table className="data" style={{ marginTop: 10 }}>
          <tbody>
            {data.topSellers.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td style={{ textAlign: "right" }}>{s.units}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function CashflowDemo({ orgName }: { orgName: string }) {
  const months = [
    { key: "2026-03", income: 9800, expense: 6900 },
    { key: "2026-04", income: 10400, expense: 7100 },
    { key: "2026-05", income: 9950, expense: 7300 },
    { key: "2026-06", income: 11200, expense: 7050 },
    { key: "2026-07", income: 10650, expense: 7250 },
    { key: "2026-08", income: 12000, expense: 7400 },
  ];
  const peak = Math.max(...months.map((m) => Math.max(m.income, m.expense)));
  const thisMonth = months[months.length - 1];
  const net = thisMonth.income - thisMonth.expense;

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader title="Cashflow planning" subtitle={orgName} />
      <section className="dash-admin-strip">
        <div className="surface dash-stat">
          <span className="kpi-label">Income</span>
          <strong className="kpi-value">{formatCurrency(thisMonth.income)}</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Expense</span>
          <strong className="kpi-value">{formatCurrency(thisMonth.expense)}</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Net</span>
          <strong className="kpi-value" style={{ color: "var(--success, #16a34a)" }}>
            {formatCurrency(net)}
          </strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Runway at current burn</span>
          <strong className="kpi-value">18d</strong>
        </div>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <strong>Income vs expense — last 6 months</strong>
        <div className="dash-trend">
          {months.map((m) => (
            <div key={m.key} className="dash-trend-col">
              <div style={{ display: "flex", gap: 3, alignItems: "flex-end", width: "100%", height: "100%" }}>
                <div
                  className="dash-trend-bar"
                  style={{ height: `${Math.round((m.income / peak) * 100)}%` }}
                />
                <div
                  className="dash-trend-bar"
                  style={{
                    height: `${Math.round((m.expense / peak) * 100)}%`,
                    background: "var(--danger, #dc2626)",
                    opacity: 0.65,
                  }}
                />
              </div>
              <span className="dash-trend-label">{m.key.slice(2)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="fluid-grid">
        <section className="surface" style={{ padding: "1rem" }}>
          <strong>Receivables ageing</strong>
          <dl className="dash-figures">
            <div>
              <dt>0–30d</dt>
              <dd>{formatCurrency(3200)}</dd>
            </div>
            <div>
              <dt>31–60d</dt>
              <dd>{formatCurrency(980)}</dd>
            </div>
            <div>
              <dt>61–90d</dt>
              <dd>{formatCurrency(320)}</dd>
            </div>
            <div>
              <dt>90d+</dt>
              <dd style={{ color: "var(--danger)" }}>{formatCurrency(150)}</dd>
            </div>
          </dl>
        </section>
        <section className="surface" style={{ padding: "1rem" }}>
          <strong>Top expense categories (this month)</strong>
          <table className="data" style={{ marginTop: 10 }}>
            <tbody>
              <tr>
                <td>Rent</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(2800)}</td>
              </tr>
              <tr>
                <td>Salary</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(2400)}</td>
              </tr>
              <tr>
                <td>Supplies</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(1300)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

export function MarketingDemo({
  niche,
  orgName,
  entityTitle,
  locale,
}: {
  niche: Niche;
  orgName: string;
  entityTitle: string;
  locale: string;
}) {
  const plays = buildMarketingPlays({
    niche,
    locale,
    entityLabel: entityTitle,
    dormant: 42,
    newCount: 17,
    avgValue: 186,
  });

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader title="Marketing" subtitle={orgName} />
      <section className="dash-admin-strip">
        <div className="surface dash-stat">
          <span className="kpi-label">{entityTitle}</span>
          <strong className="kpi-value">218</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">New (60d)</span>
          <strong className="kpi-value">17</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Active (60d)</span>
          <strong className="kpi-value">176</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">Dormant</span>
          <strong className="kpi-value">42</strong>
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
      </section>
    </div>
  );
}

export function AlertsDemo({
  niche,
  orgName,
  isAdmin,
}: {
  niche: Niche;
  orgName: string;
  isAdmin: boolean;
}) {
  const data = buildDemoSharedDashboard(niche, isAdmin ? "admin" : "staff");

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader title="Alerts" subtitle={orgName} />
      <section className="surface" style={{ padding: "1rem" }}>
        <ul className="dash-alert-list">
          {data.dbAlerts.map((a) => (
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
      </section>
    </div>
  );
}

export function TasksDemo({
  niche,
  orgName,
  isAdmin,
}: {
  niche: Niche;
  orgName: string;
  isAdmin: boolean;
}) {
  const data = buildDemoSharedDashboard(niche, isAdmin ? "admin" : "staff");

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader title="Tasks" subtitle={orgName} />
      <section className="surface" style={{ padding: "1rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Task</th>
                <th>Priority</th>
                {isAdmin ? <th>Assigned</th> : null}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                  </td>
                  <td>
                    <span className="badge">{task.priority}</span>
                  </td>
                  {isAdmin ? <td>{task.assignedToName || "Ahmad"}</td> : null}
                  <td>{task.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
