"use client";

import { Link } from "@/i18n/navigation";
import { useTransition } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DashboardAiPanel } from "@/components/DashboardAiPanel";
import { formatCurrency } from "@/lib/utils";
import type { SharedDashboardData, DashboardMode } from "@/lib/dashboard-data";
import { ActionForm } from "@/components/ActionForm";
import {
  createTaskAction,
  generateAiBriefingAction,
  recomputeStaffScoresAction,
  runSmartInventoryScanAction,
  sendOwnerChatAction,
} from "@/app/ops-brain-actions";

export type AdminDashLabels = {
  welcome: string;
  subtitle: string;
  salesToday: string;
  unpaidInvoices: string;
  peopleLabel: string;
  lowStock: string;
  cashflow: string;
  income: string;
  expense: string;
  net: string;
  aiTitle: string;
  alertsInbox: string;
  staffRanking: string;
  noScores: string;
  recomputeScores: string;
  scanInventory: string;
  briefing: string;
  generateBriefing: string;
  tasks: string;
  createTask: string;
  taskTitle: string;
  adminLinks: string;
  branches: string;
  accounting: string;
  lhdn: string;
  adminZone: string;
  marketing: string;
  chatTitle: string;
  chatPlaceholder: string;
  chatSend: string;
  activity: string;
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
  const [pending, startTransition] = useTransition();
  const net = data.kpi.income - data.kpi.expense;

  return (
    <div className="stack dash-admin" data-dash-mode={mode} data-dash-role="admin" style={{ gap: "1.25rem" }}>
      <PageHeader title={`${labels.welcome}, ${data.welcomeName}`} subtitle={labels.subtitle} />

      <div
        className="dash-kpi-ai-row"
        style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem", alignItems: "stretch" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.65rem",
            flex: "1 1 280px",
            minWidth: 0,
          }}
        >
          <div className="surface kpi" style={{ margin: 0 }}>
            <div className="kpi-label">{labels.salesToday}</div>
            <div className="kpi-value">{formatCurrency(data.kpi.salesToday)}</div>
          </div>
          <div className="surface kpi" style={{ margin: 0 }}>
            <div className="kpi-label">{labels.unpaidInvoices}</div>
            <div className="kpi-value">{data.kpi.unpaidCount}</div>
          </div>
          <div className="surface kpi" style={{ margin: 0 }}>
            <div className="kpi-label">{labels.peopleLabel}</div>
            <div className="kpi-value">{data.kpi.customerCount}</div>
          </div>
          <div className="surface kpi" style={{ margin: 0 }}>
            <div className="kpi-label">{labels.lowStock}</div>
            <div className="kpi-value">{data.kpi.lowStockCount}</div>
          </div>
        </div>
        <DashboardAiPanel
          title={labels.aiTitle}
          opsBrainEnabled={data.opsBrainEnabled}
          dbAlerts={data.dbAlerts}
          includeHighSeverity
          canResolveAlerts={!demo && data.opsBrainEnabled}
          data={{
            niche: data.niche,
            patients: data.kpi.customerCount,
            unpaidInvoices: data.kpi.unpaidCount,
            lowStock: data.kpi.lowStockCount,
            lowStockNames: data.kpi.lowStockNames,
            income: data.kpi.income,
            expense: data.kpi.expense,
            appointmentsToday: data.kpi.appointmentsToday,
            lhdnPending: data.kpi.lhdnPending,
            orgHasTin: data.kpi.orgHasTin,
          }}
        />
      </div>

      <div className="surface" style={{ padding: "1rem" }}>
        <strong>{labels.cashflow}</strong>
        <div className="row" style={{ gap: "1.5rem", marginTop: 8, flexWrap: "wrap" }}>
          <span>
            {labels.income}: <strong>{formatCurrency(data.kpi.income)}</strong>
          </span>
          <span>
            {labels.expense}: <strong>{formatCurrency(data.kpi.expense)}</strong>
          </span>
          <span>
            {labels.net}:{" "}
            <strong style={{ color: net >= 0 ? "var(--success, #16a34a)" : "var(--danger)" }}>
              {formatCurrency(net)}
            </strong>
          </span>
        </div>
      </div>

      <div className="fluid-grid">
        <div className="surface" style={{ padding: "1rem" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong>{labels.staffRanking}</strong>
            {!demo && data.opsBrainEnabled ? (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await recomputeStaffScoresAction();
                  })
                }
              >
                {labels.recomputeScores}
              </button>
            ) : null}
          </div>
          {!data.staffScores.length ? (
            <p className="muted">{labels.noScores}</p>
          ) : (
            <ol style={{ margin: "0.75rem 0 0", paddingLeft: "1.2rem" }}>
              {data.staffScores.map((s) => (
                <li key={s.userId} style={{ marginBottom: 6 }}>
                  <strong>{s.name}</strong> — {s.score} pts · {formatCurrency(s.salesAmount)} · refund{" "}
                  {s.refundRate.toFixed(1)}%
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="surface" style={{ padding: "1rem" }}>
          <strong>{labels.alertsInbox}</strong>
          <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.1rem" }}>
            {data.dbAlerts.length ? (
              data.dbAlerts.map((a) => (
                <li key={a.id} style={{ marginBottom: 6 }}>
                  <span className="badge">{a.severity}</span> {a.title}
                </li>
              ))
            ) : (
              <li className="muted">—</li>
            )}
          </ul>
          {!demo && data.opsBrainEnabled ? (
            <button
              type="button"
              className="btn btn-soft"
              style={{ marginTop: 10 }}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await runSmartInventoryScanAction();
                })
              }
            >
              {labels.scanInventory}
            </button>
          ) : null}
        </div>
      </div>

      <div className="surface" style={{ padding: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <strong>{labels.briefing}</strong>
          {!demo && data.opsBrainEnabled ? (
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
        <p style={{ marginTop: 10, lineHeight: 1.5 }}>{data.briefing || "—"}</p>
      </div>

      <div className="fluid-grid">
        <div className="surface" style={{ padding: "1rem" }}>
          <strong>{labels.tasks}</strong>
          <ul style={{ margin: "0.5rem 0", paddingLeft: "1.1rem" }}>
            {data.tasks.map((t) => (
              <li key={t.id}>
                {t.title} <span className="badge">{t.status}</span>
              </li>
            ))}
          </ul>
          {!demo ? (
            <ActionForm action={createTaskAction} className="stack" style={{ marginTop: 8 }}>
              <input name="title" className="input" placeholder={labels.taskTitle} required />
              <button type="submit" className="btn btn-soft">
                {labels.createTask}
              </button>
            </ActionForm>
          ) : null}
        </div>

        <div className="surface" style={{ padding: "1rem" }}>
          <strong>{labels.adminLinks}</strong>
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            {!demo ? (
              <>
                <Link href="/admin" className="btn btn-soft">
                  {labels.adminZone}
                </Link>
                <Link href="/admin" className="btn btn-ghost">
                  {labels.branches}
                </Link>
                <Link href="/accounting" className="btn btn-ghost">
                  {labels.accounting}
                </Link>
                <Link href="/lhdn" className="btn btn-ghost">
                  {labels.lhdn}
                </Link>
                <Link href="/alerts" className="btn btn-ghost">
                  {labels.alertsInbox}
                </Link>
                <Link href="/cycle-count" className="btn btn-ghost">
                  Cycle count
                </Link>
              </>
            ) : (
              <span className="muted">Demo links</span>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            <strong>{labels.marketing}</strong>
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem" }}>
              {data.marketingIdeas.map((idea, i) => (
                <li key={i}>{idea}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="surface" style={{ padding: "1rem" }}>
        <strong>{labels.activity}</strong>
        <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem" }}>
          {data.activitySummary.length ? (
            data.activitySummary.map((line, i) => <li key={i}>{line}</li>)
          ) : (
            <li className="muted">—</li>
          )}
        </ul>
      </div>

      {!demo && data.opsBrainEnabled ? (
        <div className="surface" style={{ padding: "1rem" }}>
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
        </div>
      ) : null}
    </div>
  );
}
