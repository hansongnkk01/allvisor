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

/** Matches real projects/page.tsx → NicheModulePage. */
export function ContractorProjectsDemo() {
  const rows = useMemo(
    () => [
      {
        id: "pr1",
        name: "SS2 shop renovation",
        status: "in_progress",
        claim_amount: 45000,
        created_at: "2026-06-15T09:00:00+08:00",
      },
      {
        id: "pr2",
        name: "Condo waterproofing",
        status: "claim_submitted",
        claim_amount: 12800,
        created_at: "2026-07-20T11:30:00+08:00",
      },
      {
        id: "pr3",
        name: "Factory floor epoxy",
        status: "draft",
        claim_amount: 0,
        created_at: "2026-08-03T14:10:00+08:00",
      },
    ],
    []
  );
  const columns = ["name", "status", "claim_amount", "created_at"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Projects" subtitle="Contractor projects / claims." />
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
              <label>Project</label>
              <input name="name" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Claim amount</label>
              <input name="claim_amount" className="input" type="number" defaultValue={0} readOnly />
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
