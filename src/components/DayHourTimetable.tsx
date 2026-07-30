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
  freeSeg: "#c5e4de", // light green
  bookedSeg: "#f0c9c4",
  closedSeg: "#ddd8d2",
  selectedSeg: "rgba(239, 68, 68, 0.28)", // light red selection fill
  tickFree: "#2f9e8a", // green lines when free
  tickBooked: "#e07070", // red lines when occupied
  tickClosed: "#b8b2aa",
  tickSelected: "#c45c5c",
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

  const hours = useMemo(() => Array.from({ length: 24 }, (_, h) => h), []);

  const kindsByMinutes = useMemo(() => {
    const map = new Map<number, SlotKind>();
    for (let h = 0; h < 24; h++) {
      const open = isHourOpen(h, openHour, closeHour, dayClosed);
      map.set(h * 60, halfSlotKind(appointments, date, h * 60, open));
      map.set(h * 60 + 30, halfSlotKind(appointments, date, h * 60 + 30, open));
    }
    return map;
  }, [openHour, closeHour, dayClosed, appointments, date]);

  const selStart =
    selectionStart != null && selectionEnd != null
      ? Math.min(selectionStart, selectionEnd)
      : selectionStart;
  const selEnd =
    selectionStart != null && selectionEnd != null
      ? Math.max(selectionStart, selectionEnd)
      : null;

  function tickSelected(minutes: number) {
    if (selStart == null) return false;
    if (selEnd == null) return minutes === selStart;
    return minutes >= selStart && minutes <= selEnd;
  }

  function segmentSelected(segStart: number) {
    if (selStart == null || selEnd == null) return false;
    return segStart >= selStart && segStart + 30 <= selEnd;
  }

  function segColor(minutes: number) {
    if (segmentSelected(minutes)) return COLOR.selectedSeg;
    const kind = kindsByMinutes.get(minutes) || "free";
    if (kind === "closed") return COLOR.closedSeg;
    if (kind === "booked") return COLOR.bookedSeg;
    return COLOR.freeSeg;
  }

  function tickButton(
    minutes: number,
    opts: { tall: boolean; trackH: number; halfH: number }
  ) {
    const kind = kindsByMinutes.get(minutes) || "free";
    const clickable = selectable && kind === "free";
    const selected = tickSelected(minutes);
    const h = opts.tall ? opts.trackH : opts.halfH;
    const w = opts.tall ? 3 : 2;

    const tickColor = selected
      ? COLOR.tickSelected
      : kind === "booked"
        ? COLOR.tickBooked
        : kind === "closed"
          ? COLOR.tickClosed
          : COLOR.tickFree;

    return (
      <button
        type="button"
        disabled={!clickable}
        title={`${slotLabel(minutes)}${
          kind === "booked"
            ? ` — ${labels.occupied}`
            : kind === "closed"
              ? ` — ${labels.closed || "closed"}`
              : clickable
                ? " · click to select"
                : ""
        }`}
        onClick={() => {
          if (clickable) onSlotSelect?.(minutes);
        }}
        style={{
          width: w + (selected ? 2 : 0),
          height: h,
          padding: 0,
          margin: 0,
          border: "none",
          borderRadius: 1,
          background: tickColor,
          cursor: clickable ? "pointer" : selectable ? "not-allowed" : "default",
          appearance: "none",
          boxShadow: selected ? "0 0 0 2px rgba(196,92,92,0.25)" : undefined,
          opacity: kind === "closed" ? 0.75 : 1,
        }}
      />
    );
  }

  const trackH = orientation === "horizontal" ? 40 : 56;
  const halfH = Math.round(trackH * 0.48);

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
            width: "100%",
            minWidth: 720,
            paddingLeft: 6,
            paddingRight: 6,
          }}
          role={selectable ? "group" : "img"}
          aria-label={labels.timetable}
        >
          {hours.map((hour) => {
            const hourMin = hour * 60;
            const halfMin = hour * 60 + 30;
            const hourSelected = tickSelected(hourMin);

            return (
              <div
                key={hour}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    height: trackH,
                    width: "100%",
                  }}
                >
                  {/* free / booked / selected segments */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "18%",
                      bottom: "18%",
                      width: "50%",
                      background: segColor(hourMin),
                      borderRadius: 2,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "18%",
                      bottom: "18%",
                      width: "50%",
                      background: segColor(halfMin),
                      borderRadius: 2,
                    }}
                  />

                  {/* thick hour line at left edge of cell (= boundary between hours) */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      transform: "translateX(-50%)",
                      display: "flex",
                      alignItems: "stretch",
                      zIndex: 2,
                    }}
                  >
                    {tickButton(hourMin, { tall: true, trackH, halfH })}
                  </div>

                  {/* thin half-hour line: horizontal + vertical center */}
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      display: "flex",
                      zIndex: 2,
                    }}
                  >
                    {tickButton(halfMin, { tall: false, trackH, halfH })}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "0.62rem",
                    lineHeight: 1,
                    textAlign: "left",
                    marginTop: 8,
                    marginLeft: -6,
                    color: hourSelected ? COLOR.tickSelected : "rgba(107, 101, 96, 0.65)",
                    fontWeight: hourSelected ? 700 : 500,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(hour).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
