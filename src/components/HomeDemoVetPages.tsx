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

/** Matches real pets/page.tsx → NicheModulePage. */
export function VetPetsDemo() {
  const customers = useMemo(() => demoCustomers("vet"), []);
  const rows = useMemo(
    () => [
      {
        id: "p1",
        name: "Buddy",
        species: "Dog",
        breed: "Golden Retriever",
        owner_id: customers[0]?.name || "Aina Rahman",
        created_at: "2026-06-12T10:00:00+08:00",
      },
      {
        id: "p2",
        name: "Mimi",
        species: "Cat",
        breed: "Domestic Shorthair",
        owner_id: customers[1]?.name || "Lim Wei",
        created_at: "2026-07-03T14:20:00+08:00",
      },
      {
        id: "p3",
        name: "Rocky",
        species: "Dog",
        breed: "Pomeranian",
        owner_id: customers[2]?.name || "Siti Aminah",
        created_at: "2026-07-22T09:45:00+08:00",
      },
    ],
    [customers]
  );
  const columns = ["name", "species", "breed", "owner_id", "created_at"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Pets" subtitle="Pet profiles linked to owners." />
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
              <label>Owner customer ID</label>
              <input name="owner_id" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Pet name</label>
              <input name="name" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Species</label>
              <input name="species" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Breed</label>
              <input name="breed" className="input" type="text" readOnly />
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
