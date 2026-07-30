"use client";

import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
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
  freeSeg: "#d7efe9",
  bookedSeg: "#f6d4cf",
  closedSeg: "#e8e4df",
  selectedSeg: "rgba(220, 80, 80, 0.28)",
  tickFree: "#0f766e",
  tickBooked: "#c45c5c",
  tickClosed: "#a8a29a",
  tickSelected: "#b42318",
  trackBorder: "rgba(28, 27, 25, 0.1)",
  trackBg: "rgba(255,255,255,0.55)",
  now: "#b45309",
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="row"
      style={{ gap: 6, fontSize: "0.72rem", color: "var(--muted)", whiteSpace: "nowrap" }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 0 2px ${color}33`,
        }}
      />
      {label}
    </span>
  );
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
  const [hoverMin, setHoverMin] = useState<number | null>(null);

  const weekdayClosed = closedWeekdays.includes(date.getDay());
  const holiday = getMyHolidayOn(date, locale);
  const dayClosed = weekdayClosed;
  const today = isSameDay(date, new Date());

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

  const nowMinutes = today ? new Date().getHours() * 60 + new Date().getMinutes() : null;
  const nowLeftPct = nowMinutes != null ? (nowMinutes / (24 * 60)) * 100 : null;

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

  function tickButton(minutes: number, opts: { tall: boolean; trackH: number; halfH: number }) {
    const kind = kindsByMinutes.get(minutes) || "free";
    const clickable = selectable && kind === "free";
    const selected = tickSelected(minutes);
    const hovered = hoverMin === minutes;
    const h = opts.tall ? opts.trackH : opts.halfH;
    const lineW = opts.tall ? (selected || hovered ? 4 : 3) : selected || hovered ? 3 : 2;
    // Invisible hit pad so users don't need to aim the thin line exactly
    const hitW = opts.tall ? 28 : 24;
    const hitH = opts.trackH + 12;

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
        aria-label={slotLabel(minutes)}
        title={`${slotLabel(minutes)}${
          kind === "booked"
            ? ` — ${labels.occupied}`
            : kind === "closed"
              ? ` — ${labels.closed || "closed"}`
              : clickable
                ? " · click to select"
                : ""
        }`}
        onMouseEnter={() => setHoverMin(minutes)}
        onMouseLeave={() => setHoverMin(null)}
        onClick={() => {
          if (clickable) onSlotSelect?.(minutes);
        }}
        style={{
          width: hitW,
          height: hitH,
          padding: 0,
          margin: 0,
          border: "none",
          borderRadius: 8,
          background: "transparent",
          cursor: clickable ? "pointer" : selectable ? "not-allowed" : "default",
          appearance: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: hovered || selected ? 4 : 2,
        }}
      >
        <span
          aria-hidden
          style={{
            width: lineW,
            height: h,
            borderRadius: 999,
            background: tickColor,
            display: "block",
            transform: hovered && clickable ? "scaleY(1.08)" : undefined,
            boxShadow: selected
              ? `0 0 0 3px ${COLOR.tickSelected}33`
              : hovered && clickable
                ? `0 0 0 3px ${COLOR.tickFree}22`
                : "none",
            transition: "transform 120ms ease, box-shadow 120ms ease, width 120ms ease",
            opacity: kind === "closed" ? 0.7 : 1,
            // Soft highlight on the hit pad when hovering a free line
            outline: hovered && clickable ? `1px solid ${COLOR.tickFree}33` : undefined,
            outlineOffset: 6,
          }}
        />
      </button>
    );
  }

  const trackH = orientation === "horizontal" ? 44 : 58;
  const halfH = Math.round(trackH * 0.5);
  const railTop = Math.round(trackH * 0.2);
  const railBottom = Math.round(trackH * 0.2);

  return (
    <div
      className="surface"
      style={{
        padding: orientation === "horizontal" ? "0.9rem 1.1rem" : "1.1rem 1.15rem",
        boxShadow: orientation === "horizontal" ? undefined : "none",
        background: holiday
          ? "rgba(220, 38, 38, 0.05)"
          : dayClosed
            ? "rgba(107, 101, 96, 0.06)"
            : undefined,
      }}
    >
      <div
        className="row"
        style={{ justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--muted)",
            fontWeight: 650,
          }}
        >
          {labels.timetable} · {format(date, "EEE d MMM")}
        </span>
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          <LegendDot color={COLOR.tickFree} label={labels.free} />
          <LegendDot color={COLOR.tickBooked} label={labels.occupied} />
          <LegendDot color={COLOR.tickClosed} label={labels.closed || "Closed"} />
          {holiday ? (
            <span className="badge" style={{ background: "rgba(220,38,38,0.12)" }}>
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
        <div style={{ minWidth: 760, padding: "0 8px 2px" }}>
          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "repeat(24, minmax(28px, 1fr))",
              width: "100%",
            }}
            role={selectable ? "group" : "img"}
            aria-label={labels.timetable}
          >
            {/* continuous rail behind everything */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: railTop,
                bottom: railBottom + 22,
                borderRadius: 999,
                background: COLOR.trackBg,
                border: `1px solid ${COLOR.trackBorder}`,
                boxShadow: "inset 0 1px 2px rgba(28,27,25,0.04)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />

            {nowLeftPct != null ? (
              <div
                aria-hidden
                title="Now"
                style={{
                  position: "absolute",
                  left: `calc(${nowLeftPct}% )`,
                  top: railTop - 4,
                  bottom: railBottom + 18,
                  width: 2,
                  marginLeft: -1,
                  borderRadius: 999,
                  background: COLOR.now,
                  boxShadow: `0 0 0 3px ${COLOR.now}22`,
                  pointerEvents: "none",
                  zIndex: 3,
                }}
              />
            ) : null}

            {hours.map((hour) => {
              const hourMin = hour * 60;
              const halfMin = hour * 60 + 30;
              const hourSelected = tickSelected(hourMin);
              const major = hour % 3 === 0;

              return (
                <div
                  key={hour}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    minWidth: 0,
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div style={{ position: "relative", height: trackH, width: "100%" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: railTop,
                        bottom: railBottom,
                        width: "50%",
                        background: segColor(hourMin),
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: railTop,
                        bottom: railBottom,
                        width: "50%",
                        background: segColor(halfMin),
                      }}
                    />

                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        transform: "translateX(-50%)",
                        display: "flex",
                        alignItems: "center",
                        zIndex: 2,
                      }}
                    >
                      {tickButton(hourMin, { tall: true, trackH, halfH })}
                    </div>

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
                      fontSize: major ? "0.68rem" : "0.6rem",
                      lineHeight: 1,
                      textAlign: "left",
                      marginTop: 10,
                      marginLeft: -8,
                      color: hourSelected
                        ? COLOR.tickSelected
                        : major
                          ? "var(--muted)"
                          : "rgba(107, 101, 96, 0.45)",
                      fontWeight: hourSelected || major ? 650 : 500,
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
    </div>
  );
}
