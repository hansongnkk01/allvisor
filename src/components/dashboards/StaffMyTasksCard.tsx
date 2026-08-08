"use client";

/** "My tasks" on the staff dashboard — the assignee ticks their own work off. */

import { useTranslations } from "next-intl";
import { ActionForm } from "@/components/ActionForm";
import { toggleTaskAction } from "@/app/ops-actions";
import type { TaskRow } from "@/lib/dashboard-data";

export function StaffMyTasksCard({ tasks, demo }: { tasks: TaskRow[]; demo?: boolean }) {
  const t = useTranslations("Dashboard");
  const open = tasks.filter((task) => task.status !== "done");
  const done = tasks.filter((task) => task.status === "done");

  return (
    <section className="surface" style={{ padding: "1rem" }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem" }}>{t("myTasksTitle")}</h2>
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          {t("myTasksOpen", { count: open.length })}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          {t("myTasksEmpty")}
        </p>
      ) : (
        <div className="stack" style={{ gap: "0.55rem" }}>
          {[...open, ...done].map((task) => {
            const isDone = task.status === "done";
            return (
              <div className="row" key={task.id} style={{ gap: "0.5rem", alignItems: "flex-start" }}>
                {demo ? (
                  <span
                    aria-hidden
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      border: "1.5px solid var(--line)",
                      display: "inline-block",
                      background: isDone ? "var(--accent)" : "transparent",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                ) : (
                  <ActionForm action={toggleTaskAction} style={{ margin: 0 }}>
                    <input type="hidden" name="task_id" value={task.id} />
                    <button
                      type="submit"
                      aria-label={isDone ? t("myTasksReopen") : t("myTasksDone")}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: "1.5px solid var(--line)",
                        background: isDone ? "var(--accent)" : "transparent",
                        color: "#fff",
                        cursor: "pointer",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {isDone ? "✓" : ""}
                    </button>
                  </ActionForm>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 600,
                      textDecoration: isDone ? "line-through" : "none",
                      opacity: isDone ? 0.6 : 1,
                    }}
                  >
                    {task.title}
                  </div>
                  {task.notes || task.due_date ? (
                    <div className="muted" style={{ fontSize: "0.75rem" }}>
                      {[task.notes, task.due_date ? `${t("myTasksDue")} ${task.due_date}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
