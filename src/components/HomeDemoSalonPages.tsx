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

/** Matches real commissions/page.tsx → NicheModulePage. */
export function SalonCommissionsDemo() {
  const rows = useMemo(
    () => [
      {
        id: "c1",
        staff_name: "Mei Ling",
        percent: 10,
        created_at: "2026-06-01T09:00:00+08:00",
      },
      {
        id: "c2",
        staff_name: "Hafiz Omar",
        percent: 8,
        created_at: "2026-06-15T11:20:00+08:00",
      },
      {
        id: "c3",
        staff_name: "Siti Aminah",
        percent: 12,
        created_at: "2026-07-02T14:40:00+08:00",
      },
    ],
    []
  );
  const columns = ["staff_name", "percent", "created_at"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Commissions" subtitle="Staff commission rules for salon services." />
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
              <label>Staff name</label>
              <input name="staff_name" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Percent</label>
              <input name="percent" className="input" type="number" defaultValue={10} readOnly />
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
