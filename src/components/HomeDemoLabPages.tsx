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

/** Matches real lab-results/page.tsx → NicheModulePage. */
export function LabResultsDemo() {
  const customers = useMemo(() => demoCustomers("lab"), []);
  const rows = useMemo(
    () => [
      {
        id: "lr1",
        customer_id: customers[0]?.name || "Aina Rahman",
        test_name: "Full blood count",
        status: "ready",
        result_summary: "Within normal range",
        created_at: "2026-08-04T10:15:00+08:00",
      },
      {
        id: "lr2",
        customer_id: customers[1]?.name || "Lim Wei",
        test_name: "Lipid panel",
        status: "processing",
        result_summary: "—",
        created_at: "2026-08-05T09:40:00+08:00",
      },
      {
        id: "lr3",
        customer_id: customers[2]?.name || "Siti Aminah",
        test_name: "HbA1c",
        status: "pending",
        result_summary: "—",
        created_at: "2026-08-05T11:05:00+08:00",
      },
    ],
    [customers]
  );
  const columns = ["customer_id", "test_name", "status", "result_summary", "created_at"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Lab results" subtitle="Diagnostic test results." />
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
              <label>Test</label>
              <input name="test_name" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Status</label>
              <input name="status" className="input" type="text" defaultValue="pending" readOnly />
            </div>
            <div className="field">
              <label>Summary</label>
              <input name="result_summary" className="input" type="text" readOnly />
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
