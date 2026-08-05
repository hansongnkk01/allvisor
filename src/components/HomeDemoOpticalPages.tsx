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

/** Matches real eye-rx/page.tsx → NicheModulePage. */
export function OpticalEyeRxDemo() {
  const customers = useMemo(() => demoCustomers("optical"), []);
  const rows = useMemo(
    () => [
      {
        id: "rx1",
        customer_id: customers[0]?.name || "Aina Rahman",
        od_sph: "-1.25",
        os_sph: "-1.50",
        pd: "62",
        created_at: "2026-08-01T10:20:00+08:00",
      },
      {
        id: "rx2",
        customer_id: customers[1]?.name || "Lim Wei",
        od_sph: "-2.00",
        os_sph: "-1.75",
        pd: "64",
        created_at: "2026-07-28T14:05:00+08:00",
      },
      {
        id: "rx3",
        customer_id: customers[2]?.name || "Siti Aminah",
        od_sph: "-0.75",
        os_sph: "-0.50",
        pd: "61",
        created_at: "2026-07-15T11:40:00+08:00",
      },
    ],
    [customers]
  );
  const columns = ["customer_id", "od_sph", "os_sph", "pd", "created_at"] as const;

  const fields = [
    { name: "customer_id", label: "Customer ID", required: true },
    { name: "od_sph", label: "OD SPH" },
    { name: "od_cyl", label: "OD CYL" },
    { name: "od_axis", label: "OD Axis" },
    { name: "os_sph", label: "OS SPH" },
    { name: "os_cyl", label: "OS CYL" },
    { name: "os_axis", label: "OS Axis" },
    { name: "pd", label: "PD" },
    { name: "notes", label: "Notes" },
  ] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Eye prescriptions" subtitle="Optical Rx records per customer." />
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
            {fields.map((f) => (
              <div className="field" key={f.name}>
                <label>{f.label}</label>
                <input name={f.name} className="input" type="text" readOnly />
              </div>
            ))}
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

/** Matches real lab-orders/page.tsx → NicheModulePage. */
export function OpticalLabOrdersDemo() {
  const customers = useMemo(() => demoCustomers("optical"), []);
  const rows = useMemo(
    () => [
      {
        id: "lo1",
        frame_name: "Ray-Ban RB5154",
        status: "sent",
        customer_id: customers[0]?.name || "Aina Rahman",
        created_at: "2026-08-02T09:30:00+08:00",
      },
      {
        id: "lo2",
        frame_name: "Oakley OX8163",
        status: "pending",
        customer_id: customers[1]?.name || "Lim Wei",
        created_at: "2026-08-04T16:10:00+08:00",
      },
      {
        id: "lo3",
        frame_name: "Gentle Monster Lilit",
        status: "ready",
        customer_id: customers[2]?.name || "Siti Aminah",
        created_at: "2026-07-30T13:00:00+08:00",
      },
    ],
    [customers]
  );
  const columns = ["frame_name", "status", "customer_id", "created_at"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Lab orders" subtitle="Frame/lens lab order tracking." />
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
              <label>Frame</label>
              <input name="frame_name" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Status</label>
              <input name="status" className="input" type="text" defaultValue="pending" readOnly />
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
