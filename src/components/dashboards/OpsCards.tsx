"use client";

/**
 * Ops Brain dashboard cards: the alerts inbox (owner) and the shared task list.
 * They read the same AlertRow / TaskRow slices for live and demo data, and hide
 * their mutation buttons in the homepage demo so nothing real is ever called.
 */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ActionForm } from "@/components/ActionForm";
import { ScoreBar } from "@/components/dashboards/ScoreBar";
import {
  setAlertStatusAction,
  addTaskAction,
  toggleTaskAction,
  regenerateBriefingAction,
} from "@/app/ops-actions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { AdminCardProps } from "@/components/dashboards/AdminCards";
import type { AlertRow, TaskRow } from "@/lib/dashboard-data";

const SEVERITY_TONE: Record<AlertRow["severity"], { bg: string; fg: string }> = {
  high: { bg: "rgba(220, 38, 38, 0.12)", fg: "#b42318" },
  medium: { bg: "rgba(217, 119, 6, 0.12)", fg: "#b45309" },
  low: { bg: "rgba(37, 99, 235, 0.10)", fg: "#1d4ed8" },
};

export function SeverityChip({ severity }: { severity: AlertRow["severity"] }) {
  const t = useTranslations("Owner");
  const tone = SEVERITY_TONE[severity] || SEVERITY_TONE.medium;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.5rem",
        borderRadius: 999,
        fontSize: "0.72rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        background: tone.bg,
        color: tone.fg,
        whiteSpace: "nowrap",
      }}
    >
      {t(`severity.${severity}` as "severity.low")}
    </span>
  );
}

function StatusChip({ status }: { status: AlertRow["status"] }) {
  const t = useTranslations("Owner");
  if (status === "open") return null;
  return (
    <span className="muted" style={{ fontSize: "0.72rem", fontStyle: "italic" }}>
      {t(`alertStatus.${status}` as "alertStatus.investigating")}
    </span>
  );
}

export function AdminAlertsInboxCard({ data, insights }: AdminCardProps) {
  const t = useTranslations("Owner");
  const locale = useLocale();
  const alerts = insights.alerts;

  return (
    <section className="surface" style={{ padding: "1rem" }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem" }}>{t("alertsInboxTitle")}</h2>
        <Link href="/alerts" className="btn btn-soft">
          {t("openAlerts")}
        </Link>
      </div>

      {alerts.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          {t("alertsInboxEmpty")}
        </p>
      ) : (
        <div className="stack" style={{ gap: "0.55rem" }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "0.6rem 0.7rem",
              }}
            >
              <div className="row" style={{ gap: "0.45rem", alignItems: "center" }}>
                <SeverityChip severity={alert.severity} />
                <strong style={{ fontSize: "0.9rem", flex: 1, minWidth: 0 }}>{alert.title}</strong>
                <StatusChip status={alert.status} />
              </div>
              <p className="muted" style={{ margin: "0.3rem 0 0", fontSize: "0.84rem" }}>
                {alert.message}
              </p>
              <div
                className="row"
                style={{
                  marginTop: "0.4rem",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span className="muted" style={{ fontSize: "0.75rem" }}>
                  {alert.staffName ? `${alert.staffName} · ` : ""}
                  {formatDateTime(alert.created_at, locale)}
                </span>
                {!data.demo && alert.status !== "resolved" ? (
                  <span className="row" style={{ gap: "0.35rem" }}>
                    {alert.status === "open" ? (
                      <ActionForm action={setAlertStatusAction} style={{ margin: 0 }}>
                        <input type="hidden" name="alert_id" value={alert.id} />
                        <input type="hidden" name="status" value="investigating" />
                        <button type="submit" className="btn btn-ghost" style={{ padding: "0.2rem 0.55rem", fontSize: "0.78rem" }}>
                          {t("markInvestigating")}
                        </button>
                      </ActionForm>
                    ) : null}
                    <ActionForm action={setAlertStatusAction} style={{ margin: 0 }}>
                      <input type="hidden" name="alert_id" value={alert.id} />
                      <input type="hidden" name="status" value="resolved" />
                      <button type="submit" className="btn btn-soft" style={{ padding: "0.2rem 0.55rem", fontSize: "0.78rem" }}>
                        {t("markResolved")}
                      </button>
                    </ActionForm>
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TaskLine({ task, demo }: { task: TaskRow; demo?: boolean }) {
  const t = useTranslations("Owner");
  const done = task.status === "done";

  const checkbox = demo ? (
    <span
      aria-hidden
      style={{
        width: 16,
        height: 16,
        borderRadius: 5,
        border: "1.5px solid var(--line)",
        display: "inline-block",
        background: done ? "var(--accent)" : "transparent",
        flexShrink: 0,
        marginTop: 2,
      }}
    />
  ) : (
    <ActionForm action={toggleTaskAction} style={{ margin: 0 }}>
      <input type="hidden" name="task_id" value={task.id} />
      <button
        type="submit"
        aria-label={done ? t("taskReopen") : t("taskDone")}
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: "1.5px solid var(--line)",
          background: done ? "var(--accent)" : "transparent",
          color: "#fff",
          cursor: "pointer",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {done ? "✓" : ""}
      </button>
    </ActionForm>
  );

  return (
    <div className="row" style={{ gap: "0.5rem", alignItems: "flex-start" }}>
      {checkbox}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.88rem",
            fontWeight: 600,
            textDecoration: done ? "line-through" : "none",
            opacity: done ? 0.6 : 1,
          }}
        >
          {task.title}
        </div>
        <div className="muted" style={{ fontSize: "0.75rem" }}>
          {[
            task.assigneeName,
            task.due_date ? `${t("taskDue")} ${task.due_date}` : null,
            task.source !== "manual" ? t(`taskSource.${task.source}` as "taskSource.ai") : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
    </div>
  );
}

/** WhatsApp stays manual for now: copy the briefing and paste it in the app. */
function CopyBriefingButton({ content }: { content: string }) {
  const t = useTranslations("Owner");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(content);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked (permissions) — the text is selectable anyway.
        }
      }}
    >
      {copied ? t("briefingCopied") : t("briefingCopyWhatsApp")}
    </button>
  );
}

export function AdminAiBriefingCard({ data, insights }: AdminCardProps) {
  const t = useTranslations("Owner");
  const locale = useLocale();
  const briefing = insights.briefing;

  return (
    <section
      className="surface"
      style={{ padding: "1rem", borderLeft: "3px solid var(--accent)" }}
    >
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.6rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem" }}>{t("briefingTitle")}</h2>
        {briefing ? (
          <span
            className="muted"
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            {briefing.model === "rules"
              ? t("briefingBasicMode")
              : t("briefingAiMode", { model: briefing.model })}
          </span>
        ) : null}
      </div>

      {briefing ? (
        <>
          <p
            style={{
              margin: 0,
              whiteSpace: "pre-line",
              fontSize: "0.9rem",
              lineHeight: 1.55,
            }}
          >
            {briefing.content}
          </p>
          <div
            className="row"
            style={{
              marginTop: "0.75rem",
              gap: "0.5rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              {t("briefingGeneratedAt", { time: formatDateTime(briefing.generated_at, locale) })}
            </span>
            {!data.demo ? (
              <>
                <ActionForm action={regenerateBriefingAction}>
                  <button type="submit" className="btn btn-ghost">
                    {t("briefingRegenerate")}
                  </button>
                </ActionForm>
                <CopyBriefingButton content={briefing.content} />
              </>
            ) : null}
          </div>
        </>
      ) : (
        <div className="row" style={{ gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <p className="muted" style={{ margin: 0, flex: 1, minWidth: 200 }}>
            {t("briefingEmpty")}
          </p>
          {!data.demo ? (
            <ActionForm action={regenerateBriefingAction}>
              <button type="submit" className="btn btn-soft">
                {t("briefingGenerateNow")}
              </button>
            </ActionForm>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function AdminStaffRankingCard({ insights }: AdminCardProps) {
  const t = useTranslations("Owner");
  const ranking = insights.staffRanking;

  return (
    <section className="surface" style={{ padding: "1rem" }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem" }}>{t("staffRankingTitle")}</h2>
        <Link href="/team" className="btn btn-soft">
          {t("openTeam")}
        </Link>
      </div>

      {ranking.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          {t("rankingEmpty")}
        </p>
      ) : (
        <div className="stack" style={{ gap: "0.6rem" }}>
          {ranking.map((entry, index) => (
            <div className="row" key={entry.userId} style={{ gap: "0.6rem", alignItems: "center" }}>
              <span
                className="muted"
                style={{ width: "1.1rem", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}
              >
                {index + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ justifyContent: "space-between", gap: "0.5rem" }}>
                  <strong style={{ fontSize: "0.88rem" }}>{entry.name}</strong>
                  <span className="muted" style={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                    {formatCurrency(entry.sales)}
                    {entry.mistakes > 0
                      ? ` · ${t("rankingMistakes", { count: entry.mistakes })}`
                      : ""}
                  </span>
                </div>
                <ScoreBar percent={entry.score} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function AdminTasksCard({ data, insights }: AdminCardProps) {
  const t = useTranslations("Owner");
  const tasks = insights.tasks;

  return (
    <section className="surface" style={{ padding: "1rem" }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem" }}>{t("tasksTitle")}</h2>
        <Link href="/alerts" className="btn btn-soft">
          {t("openAlerts")}
        </Link>
      </div>

      {!data.demo ? (
        <ActionForm action={addTaskAction} style={{ marginBottom: "0.75rem" }}>
          <div className="row" style={{ gap: "0.4rem" }}>
            <input
              name="title"
              required
              maxLength={140}
              placeholder={t("taskAddPlaceholder")}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button type="submit" className="btn btn-soft" style={{ whiteSpace: "nowrap" }}>
              {t("taskAdd")}
            </button>
          </div>
        </ActionForm>
      ) : null}

      {tasks.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          {t("tasksEmpty")}
        </p>
      ) : (
        <div className="stack" style={{ gap: "0.55rem" }}>
          {tasks.map((task) => (
            <TaskLine key={task.id} task={task} demo={data.demo} />
          ))}
        </div>
      )}
    </section>
  );
}
