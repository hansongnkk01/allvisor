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

/** Matches real shipments/page.tsx → NicheModulePage. */
export function CourierShipmentsDemo() {
  const rows = useMemo(
    () => [
      {
        id: "s1",
        tracking_no: "AV-MY-884201",
        status: "in_transit",
        notes: "PJ → KLCC · same day",
        created_at: "2026-08-05T08:20:00+08:00",
      },
      {
        id: "s2",
        tracking_no: "AV-MY-884202",
        status: "delivered",
        notes: "Shah Alam · signed by Aina",
        created_at: "2026-08-04T16:45:00+08:00",
      },
      {
        id: "s3",
        tracking_no: "AV-MY-884203",
        status: "pending",
        notes: "Pickup scheduled 6pm",
        created_at: "2026-08-05T11:10:00+08:00",
      },
    ],
    []
  );
  const columns = ["tracking_no", "status", "notes", "created_at"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Shipments" subtitle="Courier tracking." />
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
              <label>Tracking #</label>
              <input name="tracking_no" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Notes</label>
              <input name="notes" className="input" type="text" readOnly />
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
