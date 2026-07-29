"use client";

import { useMemo } from "react";
import { format } from "date-fns";

type SlotAppt = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  customers?: { name: string } | null;
};

export function DayHourTimetable({
  date,
  appointments,
  labels,
  orientation = "vertical",
}: {
  date: Date;
  appointments: SlotAppt[];
  labels: { occupied: string; free: string; timetable: string };
  orientation?: "vertical" | "horizontal";
}) {
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 8), []);

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
    <div className="surface" style={{ padding: "1rem", boxShadow: orientation === "horizontal" ? undefined : "none" }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <strong>
          {labels.timetable} · {format(date, "EEE d MMM")}
        </strong>
      </div>

      {orientation === "horizontal" ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {hours.map((hour) => {
            const items = byHour.get(hour) || [];
            const occupied = items.length > 0;
            return (
              <div
                key={hour}
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
                    {items[0]?.customers?.name || items[0]?.title}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="stack" style={{ gap: 6 }}>
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
