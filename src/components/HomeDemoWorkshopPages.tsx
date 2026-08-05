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

/** Matches real jobs/page.tsx → NicheModulePage. */
export function WorkshopJobsDemo() {
  const customers = useMemo(() => demoCustomers("workshop"), []);
  const rows = useMemo(
    () => [
      {
        id: "j1",
        title: "Brake pads + discs",
        status: "waiting_parts",
        vehicle_id: "ABC 9988",
        customer_id: customers[0]?.name || "Aina Rahman",
        created_at: "2026-08-04T09:15:00+08:00",
      },
      {
        id: "j2",
        title: "Full service",
        status: "in_progress",
        vehicle_id: "WXY 1122",
        customer_id: customers[1]?.name || "Lim Wei",
        created_at: "2026-08-05T08:40:00+08:00",
      },
      {
        id: "j3",
        title: "AC compressor",
        status: "intake",
        vehicle_id: "VEN 3344",
        customer_id: customers[2]?.name || "Siti Aminah",
        created_at: "2026-08-05T11:05:00+08:00",
      },
    ],
    [customers]
  );
  const columns = ["title", "status", "vehicle_id", "customer_id", "created_at"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Job cards" subtitle="Workshop job board." />
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
              <label>Job title</label>
              <input name="title" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Status</label>
              <input name="status" className="input" type="text" defaultValue="intake" readOnly />
            </div>
            <div className="field">
              <label>Vehicle ID</label>
              <input name="vehicle_id" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Customer ID</label>
              <input name="customer_id" className="input" type="text" readOnly />
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

/** Matches real vehicles/page.tsx → NicheModulePage. */
export function WorkshopVehiclesDemo() {
  const customers = useMemo(() => demoCustomers("workshop"), []);
  const rows = useMemo(
    () => [
      {
        id: "v1",
        plate: "ABC 9988",
        make: "Honda",
        model: "City",
        year: "2019",
        customer_id: customers[0]?.name || "Aina Rahman",
      },
      {
        id: "v2",
        plate: "WXY 1122",
        make: "Toyota",
        model: "Vios",
        year: "2021",
        customer_id: customers[1]?.name || "Lim Wei",
      },
      {
        id: "v3",
        plate: "VEN 3344",
        make: "Proton",
        model: "X50",
        year: "2022",
        customer_id: customers[2]?.name || "Siti Aminah",
      },
    ],
    [customers]
  );
  const columns = ["plate", "make", "model", "year", "customer_id"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Vehicles" subtitle="Customer vehicles for workshop jobs." />
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
              <label>Plate</label>
              <input name="plate" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Make</label>
              <input name="make" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Model</label>
              <input name="model" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Year</label>
              <input name="year" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Customer ID</label>
              <input name="customer_id" className="input" type="text" readOnly />
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
