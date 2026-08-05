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

/** Matches real work-orders/page.tsx → NicheModulePage. */
export function ManufacturingWorkOrdersDemo() {
  const rows = useMemo(
    () => [
      {
        id: "wo1",
        name: "WO-2201 · Frame batch A",
        status: "in_progress",
        notes: "Qty 200 · line 2",
        created_at: "2026-08-02T08:00:00+08:00",
      },
      {
        id: "wo2",
        name: "WO-2202 · Housing CNC",
        status: "queued",
        notes: "Awaiting material",
        created_at: "2026-08-04T10:30:00+08:00",
      },
      {
        id: "wo3",
        name: "WO-2198 · Assembly kit B",
        status: "done",
        notes: "QC passed",
        created_at: "2026-07-28T15:45:00+08:00",
      },
    ],
    []
  );
  const columns = ["name", "status", "notes", "created_at"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Work orders" subtitle="Manufacturing work orders." />
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
              <label>Order</label>
              <input name="name" className="input" type="text" readOnly />
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
