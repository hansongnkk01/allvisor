"use client";

import { useMemo, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";

function DemoNoopForm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}

/** Matches real rooms/page.tsx → NicheModulePage. */
export function HotelRoomsDemo() {
  const rows = useMemo(
    () => [
      {
        id: "r1",
        room_number: "101",
        room_type: "deluxe",
        status: "occupied",
        rate: 280,
      },
      {
        id: "r2",
        room_number: "102",
        room_type: "standard",
        status: "vacant",
        rate: 180,
      },
      {
        id: "r3",
        room_number: "201",
        room_type: "suite",
        status: "cleaning",
        rate: 450,
      },
      {
        id: "r4",
        room_number: "202",
        room_type: "standard",
        status: "vacant",
        rate: 180,
      },
    ],
    []
  );
  const columns = ["room_number", "room_type", "status", "rate"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Rooms" subtitle="Hotel room inventory and status." />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Add</h3>
        <DemoNoopForm className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>Room #</label>
              <input name="room_number" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Type</label>
              <input name="room_type" className="input" type="text" defaultValue="standard" readOnly />
            </div>
            <div className="field">
              <label>Rate</label>
              <input name="rate" className="input" type="number" defaultValue={0} readOnly />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </DemoNoopForm>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c}>{String(row[c] ?? "—")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
