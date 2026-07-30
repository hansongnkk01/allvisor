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
  openHour?: number; // inclusive 0-23
  closeHour?: number; // inclusive last open hour 0-23
  closedWeekdays?: number[]; // 0=Sun .. 6=Sat (JS getDay)
  locale?: string;
};

type HalfStatus = "free" | "booked";
type HourStatus = "closed" | "free" | "booked" | "half";

const COLOR = {
  free: "#c5e4de", // soft teal — matches accent-soft theme
  booked: "#f0c9c4", // soft coral — readable but light
  closed: "#ddd8d2", // warm grey — closed / off hours
};

function isHourOpen(hour: number, openHour: number, closeHour: number, dayClosed: boolean) {
  if (dayClosed) return false;
  const open = Math.min(23, Math.max(0, openHour));
  const close = Math.min(23, Math.max(0, closeHour));
  if (close < open) {
    return hour >= open || hour <= close;
  }
  return hour >= open && hour <= close;
}

/** Overlap of [start,end) with a half-hour window, in minutes (0–30). */
function overlapMinutes(startMs: number, endMs: number, winStart: number, winEnd: number) {
  const a = Math.max(startMs, winStart);
  const b = Math.min(endMs, winEnd);
  if (b <= a) return 0;
  return (b - a) / 60000;
}

function halfBooked(appointments: SlotAppt[], day: Date, hour: number, half: 0 | 1): boolean {
  const winStart = new Date(day);
  winStart.setHours(hour, half * 30, 0, 0);
  const winEnd = new Date(day);
  winEnd.setHours(hour, half * 30 + 30, 0, 0);
  const ws = winStart.getTime();
  const we = winEnd.getTime();

  let booked = 0;
  for (const a of appointments) {
    booked += overlapMinutes(new Date(a.starts_at).getTime(), new Date(a.ends_at).getTime(), ws, we);
    if (booked >= 10) return true; // treat ≥10 min as that half booked
  }
  return false;
}

function hourStatus(
  appointments: SlotAppt[],
  day: Date,
  hour: number,
  open: boolean
): { status: HourStatus; top: HalfStatus; bottom: HalfStatus; tip: string } {
  if (!open) {
    return { status: "closed", top: "free", bottom: "free", tip: "closed" };
  }
  const topBooked = halfBooked(appointments, day, hour, 0);
  const bottomBooked = halfBooked(appointments, day, hour, 1);
  const top: HalfStatus = topBooked ? "booked" : "free";
  const bottom: HalfStatus = bottomBooked ? "booked" : "free";

  const covering = appointments.filter((a) => {
    const s = new Date(a.starts_at);
    const e = new Date(a.ends_at);
    const hourStart = new Date(day);
    hourStart.setHours(hour, 0, 0, 0);
    const hourEnd = new Date(day);
    hourEnd.setHours(hour + 1, 0, 0, 0);
    return s < hourEnd && e > hourStart;
  });
  const tip =
    covering.length > 0
      ? covering
          .map((a) => `${a.title}${a.customers?.name ? ` · ${a.customers.name}` : ""}`)
          .join(" | ")
      : "free";

  if (topBooked && bottomBooked) return { status: "booked", top, bottom, tip };
  if (!topBooked && !bottomBooked) return { status: "free", top, bottom, tip };
  return { status: "half", top, bottom, tip };
}

function cellBackground(top: HalfStatus, bottom: HalfStatus, status: HourStatus) {
  if (status === "closed") return COLOR.closed;
  if (status === "free") return COLOR.free;
  if (status === "booked") return COLOR.booked;
  const topC = top === "booked" ? COLOR.booked : COLOR.free;
  const botC = bottom === "booked" ? COLOR.booked : COLOR.free;
  return `linear-gradient(to bottom, ${topC} 50%, ${botC} 50%)`;
}

export function DayHourTimetable({
  date,
  appointments,
  labels,
  orientation = "vertical",
  hoursConfig,
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
}) {
  const openHour = hoursConfig?.openHour ?? 0;
  const closeHour = hoursConfig?.closeHour ?? 23;
  const closedWeekdays = hoursConfig?.closedWeekdays || [];
  const locale = hoursConfig?.locale || "ms";

  const weekdayClosed = closedWeekdays.includes(date.getDay());
  const holiday = getMyHolidayOn(date, locale);
  const dayClosed = weekdayClosed;

  const hours = useMemo(() => Array.from({ length: 24 }, (_, h) => h), []);

  const slots = useMemo(() => {
    return hours.map((hour) => {
      const open = isHourOpen(hour, openHour, closeHour, dayClosed);
      const info = hourStatus(appointments, date, hour, open);
      const tipLabel =
        info.status === "closed"
          ? labels.closed || "Clinic closed"
          : info.status === "free"
            ? labels.free
            : info.status === "booked"
              ? `${labels.occupied}: ${info.tip}`
              : `${labels.occupied} / ${labels.free}: ${info.tip}`;
      return { hour, ...info, tipLabel };
    });
  }, [hours, openHour, closeHour, dayClosed, appointments, date, labels]);

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
          gridTemplateColumns: "repeat(24, minmax(18px, 1fr))",
          gap: 3,
          width: "100%",
          minWidth: 480,
          minHeight: orientation === "horizontal" ? 36 : 48,
        }}
        role="img"
        aria-label={labels.timetable}
      >
        {slots.map(({ hour, status, top, bottom, tipLabel }) => (
          <div
            key={hour}
            title={`${String(hour).padStart(2, "0")}:00 — ${tipLabel}`}
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
                flex: 1,
                minHeight: orientation === "horizontal" ? 28 : 40,
                border: "1px solid rgba(28, 27, 25, 0.18)",
                borderRadius: 3,
                background: cellBackground(top, bottom, status),
              }}
            />
            <span
              style={{
                fontSize: "0.62rem",
                lineHeight: 1,
                textAlign: "center",
                color: "rgba(107, 101, 96, 0.55)",
                fontWeight: 500,
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
