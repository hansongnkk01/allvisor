"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  updateAppointmentStatusAction,
  updateAppointmentAction,
  deleteAppointmentAction,
} from "@/app/actions";
import { DayHourTimetable, type TimetableHours } from "@/components/DayHourTimetable";
import { PatientName } from "@/components/PatientName";
import type { AppointmentStatus } from "@/lib/types";

type Appt = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  reminder_sent: boolean;
  customers?: { name: string; risk_level?: "high" | "medium" | "low" | null } | null;
};

const STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppointmentBoard({
  appointments,
  labels,
  hoursConfig,
}: {
  appointments: Appt[];
  labels: {
    calendar: string;
    list: string;
    today: string;
    patient: string;
    status: string;
    notes: string;
    reminder: string;
    delete: string;
    empty: string;
    prev: string;
    next: string;
    timetable: string;
    occupied: string;
    free: string;
    closed?: string;
    publicHoliday?: string;
    edit: string;
    save: string;
    cancel: string;
    startsAt: string;
    endsAt: string;
  };
  hoursConfig?: TimetableHours;
}) {
  const router = useRouter();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [pending, startTransition] = useTransition();

  function refreshAfter(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Appt[]>();
    for (const a of appointments) {
      const key = format(new Date(a.starts_at), "yyyy-MM-dd");
      const list = map.get(key) || [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const dayAppts = byDay.get(selectedKey) || [];

  const listHandlers = {
    onStatus: (id: string, status: AppointmentStatus) => {
      refreshAfter(() => updateAppointmentStatusAction(id, status));
    },
    onDelete: (id: string) => {
      refreshAfter(() => deleteAppointmentAction(id));
    },
    onSave: async (formData: FormData) => {
      const result = await updateAppointmentAction(formData);
      if (result?.error) return result;
      router.refresh();
      return result;
    },
  };

  return (
    <div className="stack" style={{ gap: "1rem", opacity: pending ? 0.75 : 1 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <button
            type="button"
            className={view === "calendar" ? "btn btn-soft" : "btn btn-ghost"}
            onClick={() => setView("calendar")}
          >
            {labels.calendar}
          </button>
          <button
            type="button"
            className={view === "list" ? "btn btn-soft" : "btn btn-ghost"}
            onClick={() => setView("list")}
          >
            {labels.list}
          </button>
        </div>
        {view === "calendar" ? (
          <div className="row">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setCursor((d) => addDays(startOfMonth(d), -1))}
            >
              {labels.prev}
            </button>
            <strong>{format(cursor, "MMMM yyyy")}</strong>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setCursor((d) => addDays(endOfMonth(d), 1))}
            >
              {labels.next}
            </button>
            <button
              type="button"
              className="btn btn-soft"
              onClick={() => {
                const now = new Date();
                setCursor(startOfMonth(now));
                setSelectedDay(now);
              }}
            >
              {labels.today}
            </button>
          </div>
        ) : null}
      </div>

      {view === "calendar" ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 6,
            }}
          >
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="muted" style={{ fontSize: "0.75rem", padding: "0.25rem" }}>
                {d}
              </div>
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const count = byDay.get(key)?.length || 0;
              const selected = isSameDay(day, selectedDay);
              const inMonth = isSameMonth(day, cursor);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className="surface"
                  style={{
                    padding: "0.55rem",
                    textAlign: "left",
                    minHeight: 64,
                    boxShadow: "none",
                    borderColor: selected ? "var(--accent)" : "var(--line)",
                    background: selected ? "var(--accent-soft)" : "rgba(255,255,255,0.7)",
                    opacity: inMonth ? 1 : 0.45,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{format(day, "d")}</div>
                  {count > 0 ? (
                    <div className="badge" style={{ marginTop: 6 }}>
                      {count}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            <DayHourTimetable
              date={selectedDay}
              appointments={dayAppts}
              hoursConfig={hoursConfig}
              labels={{
                timetable: labels.timetable,
                occupied: labels.occupied,
                free: labels.free,
                closed: labels.closed,
                publicHoliday: labels.publicHoliday,
              }}
            />
            <div className="surface" style={{ padding: "1rem" }}>
              <h3 style={{ marginTop: 0 }}>{format(selectedDay, "EEE, d MMM yyyy")}</h3>
              <AppointmentList items={dayAppts} labels={labels} {...listHandlers} />
            </div>
          </div>
        </>
      ) : (
        <AppointmentList items={appointments} labels={labels} {...listHandlers} />
      )}
    </div>
  );
}

function AppointmentList({
  items,
  labels,
  onStatus,
  onDelete,
  onSave,
}: {
  items: Appt[];
  labels: {
    patient: string;
    status: string;
    notes: string;
    reminder: string;
    delete: string;
    empty: string;
    edit: string;
    save: string;
    cancel: string;
    startsAt: string;
    endsAt: string;
  };
  onStatus: (id: string, status: AppointmentStatus) => void;
  onDelete: (id: string) => void;
  onSave: (formData: FormData) => Promise<{ error?: string; success?: boolean } | void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  if (!items.length) {
    return <p className="muted">{labels.empty}</p>;
  }

  return (
    <div className="stack" style={{ gap: "0.75rem" }}>
      {items.map((a) => {
        const isEditing = editingId === a.id;
        return (
          <div
            key={a.id}
            className="surface"
            style={{ padding: "0.9rem 1rem", boxShadow: "none" }}
          >
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{a.title}</strong>
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  <PatientName
                    name={a.customers?.name || "—"}
                    risk={a.customers?.risk_level}
                  />{" "}
                  · {new Date(a.starts_at).toLocaleString()} –{" "}
                  {new Date(a.ends_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                {a.notes && !isEditing ? (
                  <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
                    {labels.notes}: {a.notes}
                  </div>
                ) : null}
                {a.reminder_sent ? (
                  <div className="badge" style={{ marginTop: 6 }}>
                    {labels.reminder}
                  </div>
                ) : null}
              </div>
              <div className="row" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
                {!isEditing ? (
                  <>
                    <select
                      className="select"
                      style={{ width: 140 }}
                      value={a.status}
                      onChange={(e) => onStatus(a.id, e.target.value as AppointmentStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-soft"
                      style={{ padding: "0.4rem 0.7rem" }}
                      onClick={() => {
                        setError(null);
                        setEditingId(a.id);
                      }}
                    >
                      {labels.edit}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: "0.4rem 0.7rem" }}
                      onClick={() => onDelete(a.id)}
                    >
                      {labels.delete}
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {isEditing ? (
              <form
                className="stack"
                style={{ gap: "0.65rem", marginTop: "0.85rem" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  setError(null);
                  startSave(async () => {
                    const result = await onSave(formData);
                    if (result && "error" in result && result.error) {
                      setError(result.error);
                      return;
                    }
                    setEditingId(null);
                  });
                }}
              >
                <input type="hidden" name="id" value={a.id} />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "0.65rem",
                  }}
                >
                  <div className="field">
                    <label>{labels.startsAt}</label>
                    <input
                      name="starts_at"
                      type="datetime-local"
                      className="input"
                      required
                      defaultValue={toLocalInput(a.starts_at)}
                    />
                  </div>
                  <div className="field">
                    <label>{labels.endsAt}</label>
                    <input
                      name="ends_at"
                      type="datetime-local"
                      className="input"
                      required
                      defaultValue={toLocalInput(a.ends_at)}
                    />
                  </div>
                  <div className="field">
                    <label>{labels.status}</label>
                    <select name="status" className="select" defaultValue={a.status}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>{labels.notes}</label>
                  <input
                    name="notes"
                    className="input"
                    defaultValue={a.notes || ""}
                    placeholder={labels.notes}
                  />
                </div>
                {error ? (
                  <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.85rem" }}>{error}</p>
                ) : null}
                <div className="row">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {labels.save}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={saving}
                    onClick={() => {
                      setEditingId(null);
                      setError(null);
                    }}
                  >
                    {labels.cancel}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
