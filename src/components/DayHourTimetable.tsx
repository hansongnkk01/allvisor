"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { getMyHolidayOn, holidayLabel } from "@/lib/my-holidays";

type SlotAppt = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  customers?: { name: string; risk_level?: "high" | "medium" | "low" | null } | null;
};

export type TimetableHours = {
  openHour?: number;
  closeHour?: number;
  closedWeekdays?: number[];
  locale?: string;
};

type SlotKind = "closed" | "free" | "booked";

const COLOR = {
  free: "#c5e4de",
  booked: "#f0c9c4",
  closed: "#ddd8d2",
  selected: "#7eb8ae",
  range: "#a8d4cc",
};

/** Minutes from midnight for a half-hour slot: 0, 30, 60, … 1410 */
export function slotLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isHourOpen(hour: number, openHour: number, closeHour: number, dayClosed: boolean) {
  if (dayClosed) return false;
  const open = Math.min(23, Math.max(0, openHour));
  const close = Math.min(23, Math.max(0, closeHour));
  if (close < open) {
    return hour >= open || hour <= close;
  }
  return hour >= open && hour <= close;
}

function overlapMinutes(startMs: number, endMs: number, winStart: number, winEnd: number) {
  const a = Math.max(startMs, winStart);
  const b = Math.min(endMs, winEnd);
  if (b <= a) return 0;
  return (b - a) / 60000;
}

function halfSlotKind(
  appointments: SlotAppt[],
  day: Date,
  hour: number,
  half: 0 | 1,
  open: boolean
): { kind: SlotKind; tip: string } {
  if (!open) return { kind: "closed", tip: "closed" };

  const winStart = new Date(day);
  winStart.setHours(hour, half * 30, 0, 0);
  const winEnd = new Date(day);
  winEnd.setHours(hour, half * 30 + 30, 0, 0);
  const ws = winStart.getTime();
  const we = winEnd.getTime();

  const covering: string[] = [];
  let booked = 0;
  for (const a of appointments) {
    const start = new Date(a.starts_at).getTime();
    const endRaw = new Date(a.ends_at).getTime();
    const end = endRaw > start ? endRaw : start + 30 * 60000;
    const mins = overlapMinutes(start, end, ws, we);
    if (mins > 0) {
      covering.push(`${a.title}${a.customers?.name ? ` · ${a.customers.name}` : ""}`);
      booked += mins;
    }
  }

  if (booked >= 10) {
    return { kind: "booked", tip: covering.join(" | ") };
  }
  return { kind: "free", tip: "free" };
}

function cellBg(kind: SlotKind, highlight: "none" | "start" | "end" | "range") {
  if (highlight === "start" || highlight === "end") return COLOR.selected;
  if (highlight === "range") return COLOR.range;
  if (kind === "closed") return COLOR.closed;
  if (kind === "booked") return COLOR.booked;
  return COLOR.free;
}

export function DayHourTimetable({
  date,
  appointments,
  labels,
  orientation = "vertical",
  hoursConfig,
  selectable = false,
  selectionStart = null,
  selectionEnd = null,
  onSlotSelect,
}: {
  date: Date;
  appointments: SlotAppt[];
  labels: {
    occupied: string;
    free: string;
    timetable: string;
    closed?: string;
    publicHoliday?: string;
  };
  orientation?: "vertical" | "horizontal";
  hoursConfig?: TimetableHours;
  selectable?: boolean;
  /** Minutes from midnight (0, 30, 60, …) */
  selectionStart?: number | null;
  selectionEnd?: number | null;
  onSlotSelect?: (minutes: number) => void;
}) {
  const openHour = hoursConfig?.openHour ?? 0;
  const closeHour = hoursConfig?.closeHour ?? 23;
  const closedWeekdays = hoursConfig?.closedWeekdays || [];
  const locale = hoursConfig?.locale || "ms";

  const weekdayClosed = closedWeekdays.includes(date.getDay());
  const holiday = getMyHolidayOn(date, locale);
  const dayClosed = weekdayClosed;

  const hours = useMemo(() => Array.from({ length: 24 }, (_, h) => h), []);

  const columns = useMemo(() => {
    return hours.map((hour) => {
      const open = isHourOpen(hour, openHour, closeHour, dayClosed);
      const left = halfSlotKind(appointments, date, hour, 0, open);
      const right = halfSlotKind(appointments, date, hour, 1, open);
      return {
        hour,
        left: { ...left, minutes: hour * 60 },
        right: { ...right, minutes: hour * 60 + 30 },
      };
    });
  }, [hours, openHour, closeHour, dayClosed, appointments, date]);

  function highlightFor(minutes: number): "none" | "start" | "end" | "range" {
    if (selectionStart == null) return "none";
    if (selectionEnd == null) {
      return minutes === selectionStart ? "start" : "none";
    }
    const lo = Math.min(selectionStart, selectionEnd);
    const hi = Math.max(selectionStart, selectionEnd);
    if (minutes === selectionStart) return "start";
    if (minutes === selectionEnd) return "end";
    // range covers slots strictly between start and end (end is exclusive boundary)
    if (minutes > lo && minutes < hi) return "range";
    return "none";
  }

  function tipFor(kind: SlotKind, tip: string) {
    if (kind === "closed") return labels.closed || "Clinic closed";
    if (kind === "free") return labels.free;
    return `${labels.occupied}: ${tip}`;
  }

  return (
    <div
      className="surface"
      style={{
        padding: orientation === "horizontal" ? "0.85rem 1rem" : "1rem",
        boxShadow: orientation === "horizontal" ? undefined : "none",
        background: holiday
          ? "rgba(220, 38, 38, 0.06)"
          : dayClosed
            ? "rgba(107, 101, 96, 0.08)"
            : undefined,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
        <span
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--muted)",
            fontWeight: 600,
          }}
        >
          {labels.timetable} · {format(date, "EEE d MMM")}
        </span>
        <div className="row" style={{ gap: 6 }}>
          {holiday ? (
            <span className="badge" style={{ background: "rgba(220,38,38,0.15)" }}>
              {(labels.publicHoliday || "Public holiday") +
                ": " +
                holidayLabel(holiday, locale)}
            </span>
          ) : null}
          {dayClosed ? (
            <span className="badge">{labels.closed || "Clinic closed"}</span>
          ) : null}
        </div>
      </div>

      <div style={{ overflowX: "auto", width: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(24, minmax(28px, 1fr))",
            gap: 3,
            width: "100%",
            minWidth: 680,
            minHeight: orientation === "horizontal" ? 36 : 48,
          }}
          role={selectable ? "group" : "img"}
          aria-label={labels.timetable}
        >
          {columns.map(({ hour, left, right }) => (
            <div
              key={hour}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 4,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 2,
                  flex: 1,
                  minHeight: orientation === "horizontal" ? 28 : 44,
                }}
              >
                {([left, right] as const).map((half) => {
                  const clickable = selectable && half.kind === "free";
                  const highlight = highlightFor(half.minutes);
                  const label = slotLabel(half.minutes);
                  return (
                    <button
                      key={half.minutes}
                      type="button"
                      disabled={!clickable}
                      title={`${label} — ${tipFor(half.kind, half.tip)}${
                        clickable
                          ? " · click to select"
                          : selectable && half.kind !== "free"
                            ? " · unavailable"
                            : ""
                      }`}
                      onClick={() => {
                        if (clickable) onSlotSelect?.(half.minutes);
                      }}
                      style={{
                        minWidth: 0,
                        border:
                          highlight !== "none"
                            ? "2px solid var(--accent-ink)"
                            : "1px solid rgba(28, 27, 25, 0.18)",
                        borderRadius: 3,
                        background: cellBg(half.kind, highlight),
                        cursor: clickable ? "pointer" : "not-allowed",
                        opacity: !clickable && selectable && half.kind !== "free" ? 0.85 : 1,
                        padding: 0,
                        appearance: "none",
                      }}
                    />
                  );
                })}
              </div>
              <span
                style={{
                  fontSize: "0.62rem",
                  lineHeight: 1,
                  textAlign: "center",
                  color:
                    highlightFor(left.minutes) !== "none" ||
                    highlightFor(right.minutes) !== "none"
                      ? "var(--accent-ink)"
                      : "rgba(107, 101, 96, 0.55)",
                  fontWeight:
                    highlightFor(left.minutes) !== "none" ||
                    highlightFor(right.minutes) !== "none"
                      ? 700
                      : 500,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(hour).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
