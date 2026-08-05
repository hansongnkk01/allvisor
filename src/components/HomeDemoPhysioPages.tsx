"use client";

import { useMemo, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { demoCustomers } from "@/lib/demo-dashboard-data";

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

/** Matches real packages/page.tsx → NicheModulePage. */
export function PhysioPackagesDemo() {
  const customers = useMemo(() => demoCustomers("physio"), []);
  const rows = useMemo(
    () => [
      {
        id: "pk1",
        customer_id: customers[0]?.name || "Aina Rahman",
        name: "Back rehab 10x",
        total_sessions: 10,
        used_sessions: 4,
      },
      {
        id: "pk2",
        customer_id: customers[1]?.name || "Lim Wei",
        name: "Knee strengthen 6x",
        total_sessions: 6,
        used_sessions: 2,
      },
      {
        id: "pk3",
        customer_id: customers[2]?.name || "Siti Aminah",
        name: "Sports recovery 8x",
        total_sessions: 8,
        used_sessions: 8,
      },
    ],
    [customers]
  );
  const columns = ["customer_id", "name", "total_sessions", "used_sessions"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Session packages" subtitle="Physio / package session tracking." />
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
              <label>Customer ID</label>
              <input name="customer_id" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Package</label>
              <input name="name" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Total sessions</label>
              <input name="total_sessions" className="input" type="number" defaultValue={10} readOnly />
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
