"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
  createAppointmentAction,
  updateAppointmentStatusAction,
  updateAppointmentAction,
  deleteAppointmentAction,
} from "@/app/actions";
import { DayHourTimetable, slotLabel, type TimetableHours } from "@/components/DayHourTimetable";
import { PatientName } from "@/components/PatientName";
import type { AppointmentStatus } from "@/lib/types";
import { createPortal } from "react-dom";
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

type PatientOpt = { id: string; name: string; risk_level?: "high" | "medium" | "low" | null };
type CategoryOpt = { id: string; name: string };

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
  return toLocalInputFromDate(d);
}

function toLocalInputFromDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dayAtMinutes(day: Date, minutes: number) {
  const d = new Date(day);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

export function AppointmentBoard({
  appointments,
  labels,
  hoursConfig,
  patients = [],
  categories = [],
}: {
  appointments: Appt[];
  patients?: PatientOpt[];
  categories?: CategoryOpt[];
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
    bookHint: string;
    pickStart: string;
    pickEnd: string;
    pickPatient: string;
    bookNow: string;
    category: string;
    needCategory: string;
    resetBooking: string;
  };
  hoursConfig?: TimetableHours;
}) {
  const router = useRouter();
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [pending, startTransition] = useTransition();

  const [startSlot, setStartSlot] = useState<number | null>(null);
  const [endSlot, setEndSlot] = useState<number | null>(null);
  const [patientId, setPatientId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [bookError, setBookError] = useState<string | null>(null);
  const [mouse, setMouse] = useState({ x: 24, y: 24 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const bookingActive = startSlot != null || endSlot != null;
  // Follow cursor while picking times; freeze once end slot is chosen.
  // Re-tapping the timetable clears endSlot and starts following again.
  const followMouse = startSlot != null && endSlot == null;

  useEffect(() => {
    if (!followMouse) return;
    const onMove = (e: MouseEvent) => {
      setMouse({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [followMouse]);

  function resetBooking() {
    setStartSlot(null);
    setEndSlot(null);
    setPatientId("");
    setCategoryId("");
    setNotes("");
    setBookError(null);
  }

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

  const stepHint =
    startSlot == null
      ? labels.pickStart
      : endSlot == null
        ? labels.pickEnd
        : labels.pickPatient;

  const canSubmit =
    startSlot != null &&
    endSlot != null &&
    endSlot > startSlot &&
    Boolean(patientId) &&
    Boolean(categoryId) &&
    categories.length > 0;

  function onSlotSelect(minutes: number) {
    setBookError(null);
    if (startSlot == null || (startSlot != null && endSlot != null)) {
      // New selection or re-pick after end was set → follow mouse again
      setStartSlot(minutes);
      setEndSlot(null);
      return;
    }
    if (minutes === startSlot) {
      // same slot → default +30 min
      if (minutes + 30 <= 23 * 60 + 30) setEndSlot(minutes + 30);
      else setBookError("Pick a later end time");
      return;
    }
    if (minutes < startSlot) {
      setEndSlot(startSlot);
      setStartSlot(minutes);
      return;
    }
    setEndSlot(minutes);
  }

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

  const floatLeft = Math.min(
    mouse.x + 18,
    typeof window !== "undefined" ? window.innerWidth - 300 : mouse.x
  );
  const floatTop = Math.min(
    mouse.y + 18,
    typeof window !== "undefined" ? window.innerHeight - 320 : mouse.y
  );

  return (
    <div className="stack" style={{ gap: "1rem", opacity: pending ? 0.75 : 1 }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
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
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setCursor((d) => addDays(startOfMonth(d), -1));
                resetBooking();
              }}
            >
              {labels.prev}
            </button>
            <strong>{format(cursor, "MMMM yyyy")}</strong>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setCursor((d) => addDays(endOfMonth(d), 1));
                resetBooking();
              }}
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
                resetBooking();
              }}
            >
              {labels.today}
            </button>
          </div>
        ) : null}
      </div>

      {view === "calendar" ? (
        <>
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            {labels.bookHint}
          </p>

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
                  onClick={() => {
                    setSelectedDay(day);
                    resetBooking();
                  }}
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

          <DayHourTimetable
            date={selectedDay}
            appointments={dayAppts}
            hoursConfig={hoursConfig}
            selectable
            selectionStart={startSlot}
            selectionEnd={endSlot}
            onSlotSelect={onSlotSelect}
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
        </>
      ) : (
        <AppointmentList items={appointments} labels={labels} {...listHandlers} />
      )}

      {mounted &&
      view === "calendar" &&
      bookingActive
        ? createPortal(
            <div
              style={{
                position: "fixed",
                left: floatLeft,
                top: floatTop,
                zIndex: 10000,
                width: 280,
                maxWidth: "calc(100vw - 24px)",
                maxHeight: "calc(100vh - 24px)",
                overflowY: "auto",
                padding: "0.9rem 1rem",
                borderRadius: 14,
                background: "rgba(255,255,255,0.98)",
                border: followMouse ? "1px solid var(--line)" : "1.5px solid var(--accent)",
                boxShadow: "0 16px 48px rgba(28,27,25,0.28)",
                pointerEvents: "auto",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <strong style={{ fontSize: "0.85rem" }}>{stepHint}</strong>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: "0.2rem 0.45rem", fontSize: "0.75rem" }}
                  onClick={resetBooking}
                >
                  {labels.resetBooking}
                </button>
              </div>

              <div className="stack" style={{ gap: 6, fontSize: "0.85rem" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="muted">{labels.calendar}</span>
                  <span>{format(selectedDay, "EEE d MMM")}</span>
                </div>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="muted">{labels.startsAt}</span>
                  <strong style={{ color: "var(--accent-ink)" }}>
                    {startSlot == null ? "—" : slotLabel(startSlot)}
                  </strong>
                </div>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="muted">{labels.endsAt}</span>
                  <strong style={{ color: "var(--accent-ink)" }}>
                    {endSlot == null ? "—" : slotLabel(endSlot)}
                  </strong>
                </div>
              </div>

              {startSlot != null && endSlot != null ? (
                <div className="stack" style={{ gap: 8, marginTop: 10 }}>
                  <div className="field">
                    <label>{labels.patient}</label>
                    <select
                      className="select"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      required
                    >
                      <option value="">—</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>{labels.category}</label>
                    <select
                      className="select"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                    >
                      <option value="">—</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>{labels.notes}</label>
                    <input
                      className="input"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={labels.notes}
                    />
                  </div>
                  {!categories.length ? (
                    <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                      {labels.needCategory}
                    </p>
                  ) : null}
                  {bookError ? (
                    <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.8rem" }}>
                      {bookError}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canSubmit || pending}
                    onClick={() => {
                      if (startSlot == null || endSlot == null) return;
                      const startDt = dayAtMinutes(selectedDay, startSlot);
                      const endDt = dayAtMinutes(selectedDay, endSlot);
                      const clash = dayAppts.some((a) => {
                        const s = new Date(a.starts_at).getTime();
                        const eRaw = new Date(a.ends_at).getTime();
                        const e = eRaw > s ? eRaw : s + 30 * 60000;
                        return s < endDt.getTime() && e > startDt.getTime();
                      });
                      if (clash) {
                        setBookError("Selected time overlaps another booking");
                        return;
                      }
                      const fd = new FormData();
                      fd.set("customer_id", patientId);
                      fd.set("category_id", categoryId);
                      fd.set("starts_at", toLocalInputFromDate(startDt));
                      fd.set("ends_at", toLocalInputFromDate(endDt));
                      fd.set("status", "scheduled");
                      fd.set("notes", notes);
                      setBookError(null);
                      startTransition(async () => {
                        const result = await createAppointmentAction(fd);
                        if (result && "error" in result && result.error) {
                          setBookError(result.error);
                          return;
                        }
                        resetBooking();
                        router.refresh();
                      });
                    }}
                  >
                    {labels.bookNow}
                  </button>
                </div>
              ) : (
                <p className="muted" style={{ margin: "10px 0 0", fontSize: "0.8rem" }}>
                  {stepHint}
                </p>
              )}
            </div>,
            document.body
          )
        : null}
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
        const start = new Date(a.starts_at);
        const end = new Date(a.ends_at);
        const endDisplay =
          end.getTime() > start.getTime()
            ? end
            : new Date(start.getTime() + 30 * 60000);
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
                  · {start.toLocaleString()} –{" "}
                  {endDisplay.toLocaleTimeString([], {
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
                      defaultValue={toLocalInput(
                        end.getTime() > start.getTime()
                          ? a.ends_at
                          : new Date(start.getTime() + 60 * 60000).toISOString()
                      )}
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
