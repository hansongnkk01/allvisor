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

/** Matches real listings/page.tsx → NicheModulePage. */
export function PropertyListingsDemo() {
  const rows = useMemo(
    () => [
      {
        id: "l1",
        title: "Condo · SS2 · 3R2B",
        status: "active",
        notes: "Near LRT · RM 2,200/mo",
        created_at: "2026-07-10T10:00:00+08:00",
      },
      {
        id: "l2",
        title: "Terrace · Shah Alam · 4R3B",
        status: "reserved",
        notes: "Sale · RM 780k",
        created_at: "2026-07-22T14:30:00+08:00",
      },
      {
        id: "l3",
        title: "Shop lot · PJ Section 14",
        status: "active",
        notes: "Ground floor · RM 4,500/mo",
        created_at: "2026-08-01T09:15:00+08:00",
      },
    ],
    []
  );
  const columns = ["title", "status", "notes", "created_at"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Listings" subtitle="Property listings." />
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
              <label>Title</label>
              <input name="title" className="input" type="text" readOnly />
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
