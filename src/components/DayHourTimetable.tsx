"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { PatientName } from "@/components/PatientName";
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
  closeHour?: number; // inclusive last displayed hour 0-23
  closedWeekdays?: number[]; // 0=Sun .. 6=Sat (JS getDay)
  locale?: string;
};

function buildHours(openHour: number, closeHour: number) {
  const open = Math.min(23, Math.max(0, openHour));
  const close = Math.min(23, Math.max(0, closeHour));
  if (close < open) {
    // overnight shift: open..23 then 0..close
    const hours: number[] = [];
    for (let h = open; h <= 23; h++) hours.push(h);
    for (let h = 0; h <= close; h++) hours.push(h);
    return hours;
  }
  const hours: number[] = [];
  for (let h = open; h <= close; h++) hours.push(h);
  return hours;
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

  const hours = useMemo(() => buildHours(openHour, closeHour), [openHour, closeHour]);

  const weekdayClosed = closedWeekdays.includes(date.getDay());
  const holiday = getMyHolidayOn(date, locale);
  const dayClosed = weekdayClosed;

  const byHour = useMemo(() => {
    const map = new Map<number, SlotAppt[]>();
    for (const a of appointments) {
      const h = new Date(a.starts_at).getHours();
      const list = map.get(h) || [];
      list.push(a);
      map.set(h, list);
    }
    return map;
  }, [appointments]);

  return (
    <div
      className="surface"
      style={{
        padding: "1rem",
        boxShadow: orientation === "horizontal" ? undefined : "none",
        background: holiday
          ? "rgba(220, 38, 38, 0.06)"
          : dayClosed
            ? "rgba(107, 101, 96, 0.08)"
            : undefined,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
        <strong>
          {labels.timetable} · {format(date, "EEE d MMM")}
        </strong>
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

      {dayClosed && !appointments.length ? (
        <p className="muted" style={{ margin: 0 }}>
          {labels.closed || "Clinic closed today (weekly off)."}
        </p>
      ) : null}

      {orientation === "horizontal" ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
            opacity: dayClosed ? 0.55 : 1,
          }}
        >
          {hours.map((hour) => {
            const items = byHour.get(hour) || [];
            const occupied = items.length > 0;
            return (
              <div
                key={`${hour}-${items.length}`}
                style={{
                  minWidth: 88,
                  flex: "0 0 auto",
                  padding: "0.55rem 0.5rem",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: occupied ? "var(--accent-soft)" : "rgba(255,255,255,0.65)",
                  textAlign: "center",
                }}
                title={
                  occupied
                    ? items
                        .map(
                          (a) =>
                            `${a.title}${a.customers?.name ? ` · ${a.customers.name}` : ""}`
                        )
                        .join(" | ")
                    : labels.free
                }
              >
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                  {String(hour).padStart(2, "0")}:00
                </div>
                <div className="badge" style={{ marginTop: 6 }}>
                  {occupied ? labels.occupied : labels.free}
                </div>
                {occupied ? (
                  <div
                    className="muted"
                    style={{
                      fontSize: "0.7rem",
                      marginTop: 6,
                      lineHeight: 1.3,
                      maxHeight: 36,
                      overflow: "hidden",
                    }}
                  >
                    {items[0]?.customers?.name ? (
                      <PatientName
                        name={items[0].customers.name}
                        risk={items[0].customers.risk_level}
                      />
                    ) : (
                      items[0]?.title
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="stack" style={{ gap: 6, opacity: dayClosed ? 0.55 : 1 }}>
          {hours.map((hour) => {
            const items = byHour.get(hour) || [];
            const occupied = items.length > 0;
            return (
              <div
                key={hour}
                className="row"
                style={{
                  justifyContent: "space-between",
                  padding: "0.45rem 0.6rem",
                  borderRadius: 10,
                  background: occupied ? "var(--accent-soft)" : "rgba(255,255,255,0.65)",
                  border: "1px solid var(--line)",
                }}
              >
                <span style={{ fontWeight: 600, width: 64 }}>
                  {String(hour).padStart(2, "0")}:00
                </span>
                <span style={{ flex: 1, fontSize: "0.88rem" }}>
                  {occupied
                    ? items
                        .map(
                          (a) =>
                            `${a.title}${a.customers?.name ? ` · ${a.customers.name}` : ""}`
                        )
                        .join(" | ")
                    : labels.free}
                </span>
                <span className="badge">{occupied ? labels.occupied : labels.free}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
