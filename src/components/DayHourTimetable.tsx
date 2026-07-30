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
  freeSeg: "transparent",
  bookedSeg: "#f0c9c4",
  closedSeg: "#ddd8d2",
  selectedSeg: "rgba(239, 68, 68, 0.22)", // light red between lines
  tickHour: "#4a4540",
  tickHalf: "#9a948c",
  tickSelected: "#c45c5c",
  tickDisabled: "#cfc9c2",
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
  minutes: number,
  open: boolean
): SlotKind {
  if (!open) return "closed";

  const hour = Math.floor(minutes / 60);
  const half = (minutes % 60 === 0 ? 0 : 1) as 0 | 1;
  const winStart = new Date(day);
  winStart.setHours(hour, half * 30, 0, 0);
  const winEnd = new Date(day);
  winEnd.setHours(hour, half * 30 + 30, 0, 0);
  const ws = winStart.getTime();
  const we = winEnd.getTime();

  let booked = 0;
  for (const a of appointments) {
    const start = new Date(a.starts_at).getTime();
    const endRaw = new Date(a.ends_at).getTime();
    const end = endRaw > start ? endRaw : start + 30 * 60000;
    booked += overlapMinutes(start, end, ws, we);
    if (booked >= 10) return "booked";
  }
  return "free";
}

type Tick = {
  minutes: number;
  kind: "hour" | "half";
  hourLabel?: string;
};

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

  const ticks: Tick[] = useMemo(() => {
    const list: Tick[] = [];
    for (let h = 0; h < 24; h++) {
      list.push({
        minutes: h * 60,
        kind: "hour",
        hourLabel: String(h).padStart(2, "0"),
      });
      list.push({ minutes: h * 60 + 30, kind: "half" });
    }
    return list;
  }, []);

  const kindsByMinutes = useMemo(() => {
    const map = new Map<number, SlotKind>();
    for (const t of ticks) {
      const hour = Math.floor(t.minutes / 60);
      const open = isHourOpen(hour, openHour, closeHour, dayClosed);
      map.set(t.minutes, halfSlotKind(appointments, date, t.minutes, open));
    }
    return map;
  }, [ticks, openHour, closeHour, dayClosed, appointments, date]);

  const selStart =
    selectionStart != null && selectionEnd != null
      ? Math.min(selectionStart, selectionEnd)
      : selectionStart;
  const selEnd =
    selectionStart != null && selectionEnd != null
      ? Math.max(selectionStart, selectionEnd)
      : null;

  function tickInSelection(minutes: number) {
    if (selStart == null) return false;
    if (selEnd == null) return minutes === selStart;
    return minutes >= selStart && minutes <= selEnd;
  }

  function segmentInSelection(segStart: number) {
    if (selStart == null || selEnd == null) return false;
    // segment [segStart, segStart+30) is inside [selStart, selEnd)
    return segStart >= selStart && segStart + 30 <= selEnd;
  }

  function segmentBaseColor(segStart: number) {
    const kind = kindsByMinutes.get(segStart) || "free";
    if (kind === "closed") return COLOR.closedSeg;
    if (kind === "booked") return COLOR.bookedSeg;
    return COLOR.freeSeg;
  }

  const tall = orientation === "horizontal" ? 36 : 52;

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
            display: "flex",
            alignItems: "flex-end",
            width: "100%",
            minWidth: 720,
            height: tall + 22,
            paddingTop: 4,
          }}
          role={selectable ? "group" : "img"}
          aria-label={labels.timetable}
        >
          {ticks.map((tick, i) => {
            const kind = kindsByMinutes.get(tick.minutes) || "free";
            const clickable = selectable && kind === "free";
            const selected = tickInSelection(tick.minutes);
            const isHour = tick.kind === "hour";
            const tickH = isHour ? tall : Math.round(tall * 0.45);
            const tickW = isHour ? 3 : 2;
            const next = ticks[i + 1];

            return (
              <div
                key={tick.minutes}
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  flex: isHour ? "0 0 auto" : "1 1 0",
                  minWidth: isHour ? 0 : 8,
                  height: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    flex: "0 0 auto",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <button
                    type="button"
                    disabled={!clickable}
                    title={`${slotLabel(tick.minutes)}${
                      kind === "booked"
                        ? ` — ${labels.occupied}`
                        : kind === "closed"
                          ? ` — ${labels.closed || "closed"}`
                          : clickable
                            ? " · click to select"
                            : ""
                    }`}
                    onClick={() => {
                      if (clickable) onSlotSelect?.(tick.minutes);
                    }}
                    style={{
                      width: tickW + (clickable || selected ? 4 : 0),
                      minWidth: tickW,
                      height: tickH,
                      padding: 0,
                      margin: 0,
                      border: "none",
                      borderRadius: 1,
                      background: selected
                        ? COLOR.tickSelected
                        : !clickable && selectable
                          ? COLOR.tickDisabled
                          : isHour
                            ? COLOR.tickHour
                            : COLOR.tickHalf,
                      cursor: clickable ? "pointer" : selectable ? "not-allowed" : "default",
                      appearance: "none",
                      boxShadow: selected ? "0 0 0 2px rgba(196,92,92,0.25)" : undefined,
                    }}
                  />
                  {isHour ? (
                    <span
                      style={{
                        fontSize: "0.62rem",
                        lineHeight: 1,
                        marginTop: 6,
                        color: selected ? COLOR.tickSelected : "rgba(107, 101, 96, 0.65)",
                        fontWeight: selected ? 700 : 500,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {tick.hourLabel}
                    </span>
                  ) : (
                    <span style={{ height: 14, marginTop: 6 }} />
                  )}
                </div>

                {next ? (
                  <div
                    style={{
                      flex: "1 1 0",
                      minWidth: 4,
                      height: Math.round(tall * 0.55),
                      marginBottom: 14,
                      alignSelf: "flex-end",
                      background: segmentInSelection(tick.minutes)
                        ? COLOR.selectedSeg
                        : segmentBaseColor(tick.minutes),
                      borderRadius: 1,
                    }}
                    title={
                      segmentInSelection(tick.minutes)
                        ? `${slotLabel(tick.minutes)} – ${slotLabel(next.minutes)}`
                        : undefined
                    }
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
