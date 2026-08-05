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

/** Matches real tables/page.tsx → NicheModulePage. */
export function FnbTablesDemo() {
  const rows = useMemo(
    () => [
      {
        id: "t1",
        name: "T1",
        seats: 2,
        status: "occupied",
        created_at: "2026-05-01T09:00:00+08:00",
      },
      {
        id: "t2",
        name: "T2",
        seats: 4,
        status: "free",
        created_at: "2026-05-01T09:00:00+08:00",
      },
      {
        id: "t3",
        name: "T5",
        seats: 6,
        status: "reserved",
        created_at: "2026-06-12T11:20:00+08:00",
      },
      {
        id: "t4",
        name: "Bar-1",
        seats: 3,
        status: "free",
        created_at: "2026-07-03T14:00:00+08:00",
      },
    ],
    []
  );
  const columns = ["name", "seats", "status", "created_at"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Tables" subtitle="Dining table map / status (F&B)." />
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
              <label>Table name</label>
              <input name="name" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Seats</label>
              <input name="seats" className="input" type="number" defaultValue={4} readOnly />
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
