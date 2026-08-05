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

function NicheModuleExactDemo({
  title,
  subtitle,
  fields,
  columns,
  rows,
}: {
  title: string;
  subtitle: string;
  fields: Array<{
    name: string;
    label: string;
    type?: "text" | "number" | "date";
    defaultValue?: string | number;
  }>;
  columns: string[];
  rows: Array<Record<string, string | number>>;
}) {
  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={title} subtitle={subtitle} />
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
                <input
                  name={f.name}
                  className="input"
                  type={f.type || "text"}
                  defaultValue={f.defaultValue ?? ""}
                  readOnly
                />
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
              {rows.map((row, i) => (
                <tr key={String(row.id ?? i)}>
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

/** Matches real matters/page.tsx */
export function LegalMattersDemo() {
  const rows = useMemo(
    () => [
      {
        id: "m1",
        title: "Sale & purchase · SS2",
        status: "active",
        notes: "Retainer paid",
        created_at: "2026-07-10T09:00:00+08:00",
      },
      {
        id: "m2",
        title: "Employment dispute",
        status: "pending",
        notes: "Hearing 12 Aug",
        created_at: "2026-07-28T14:20:00+08:00",
      },
      {
        id: "m3",
        title: "Company secretarial",
        status: "active",
        notes: "Annual return due",
        created_at: "2026-08-01T11:05:00+08:00",
      },
    ],
    []
  );
  return (
    <NicheModuleExactDemo
      title="Matters"
      subtitle="Legal matters / retainers."
      fields={[
        { name: "title", label: "Matter" },
        { name: "notes", label: "Notes" },
      ]}
      columns={["title", "status", "notes", "created_at"]}
      rows={rows}
    />
  );
}

/** Matches real events/page.tsx */
export function EventsPlansDemo() {
  const rows = useMemo(
    () => [
      {
        id: "e1",
        title: "Wedding · Ballroom A",
        event_date: "2026-09-12",
        status: "confirmed",
        created_at: "2026-06-20T10:00:00+08:00",
      },
      {
        id: "e2",
        title: "Corporate dinner",
        event_date: "2026-08-22",
        status: "planning",
        created_at: "2026-07-15T13:30:00+08:00",
      },
      {
        id: "e3",
        title: "Product launch",
        event_date: "2026-10-05",
        status: "draft",
        created_at: "2026-08-02T16:00:00+08:00",
      },
    ],
    []
  );
  return (
    <NicheModuleExactDemo
      title="Events"
      subtitle="Event plans and timelines."
      fields={[
        { name: "title", label: "Event" },
        { name: "event_date", label: "Date", type: "date" },
      ]}
      columns={["title", "event_date", "status", "created_at"]}
      rows={rows}
    />
  );
}

/** Matches real plots/page.tsx */
export function FarmPlotsDemo() {
  const rows = useMemo(
    () => [
      {
        id: "pl1",
        name: "Plot A1",
        crop: "Chili",
        status: "growing",
        created_at: "2026-05-01T08:00:00+08:00",
      },
      {
        id: "pl2",
        name: "Plot B3",
        crop: "Leafy greens",
        status: "harvest_ready",
        created_at: "2026-06-12T09:30:00+08:00",
      },
      {
        id: "pl3",
        name: "Plot C2",
        crop: "Corn",
        status: "fallow",
        created_at: "2026-07-01T11:00:00+08:00",
      },
    ],
    []
  );
  return (
    <NicheModuleExactDemo
      title="Plots"
      subtitle="Farm plots and crops."
      fields={[
        { name: "name", label: "Plot" },
        { name: "crop", label: "Crop" },
      ]}
      columns={["name", "crop", "status", "created_at"]}
      rows={rows}
    />
  );
}

/** Matches real laundry/page.tsx */
export function LaundryTicketsDemo() {
  const customers = useMemo(() => demoCustomers("laundry"), []);
  const rows = useMemo(
    () => [
      {
        id: "lt1",
        ticket_number: "L-1042",
        status: "ready",
        item_count: 8,
        customer_id: customers[0]?.name || "Aina Rahman",
        created_at: "2026-08-04T10:00:00+08:00",
      },
      {
        id: "lt2",
        ticket_number: "L-1043",
        status: "washing",
        item_count: 12,
        customer_id: customers[1]?.name || "Lim Wei",
        created_at: "2026-08-05T09:15:00+08:00",
      },
      {
        id: "lt3",
        ticket_number: "L-1044",
        status: "drop_off",
        item_count: 4,
        customer_id: customers[2]?.name || "Siti Aminah",
        created_at: "2026-08-05T11:40:00+08:00",
      },
    ],
    [customers]
  );
  return (
    <NicheModuleExactDemo
      title="Laundry tickets"
      subtitle="Drop-off / ready / pickup tickets."
      fields={[
        { name: "ticket_number", label: "Ticket #" },
        { name: "customer_id", label: "Customer ID" },
        { name: "item_count", label: "Items", type: "number", defaultValue: 1 },
        { name: "notes", label: "Notes" },
      ]}
      columns={["ticket_number", "status", "item_count", "customer_id", "created_at"]}
      rows={rows}
    />
  );
}

/** Matches real variants/page.tsx */
export function FashionVariantsDemo() {
  const rows = useMemo(
    () => [
      {
        id: "v1",
        product_id: "Cotton tee",
        size: "M",
        color: "Black",
        sku: "TEE-BK-M",
        barcode: "9550002001",
        quantity: 24,
      },
      {
        id: "v2",
        product_id: "Cotton tee",
        size: "L",
        color: "White",
        sku: "TEE-WH-L",
        barcode: "9550002002",
        quantity: 12,
      },
      {
        id: "v3",
        product_id: "Denim jacket",
        size: "S",
        color: "Blue",
        sku: "JKT-BL-S",
        barcode: "9550002003",
        quantity: 6,
      },
    ],
    []
  );
  return (
    <NicheModuleExactDemo
      title="Variants"
      subtitle="Size/color variants for fashion stock."
      fields={[
        { name: "product_id", label: "Product ID" },
        { name: "size", label: "Size" },
        { name: "color", label: "Color" },
        { name: "sku", label: "SKU" },
        { name: "barcode", label: "Barcode" },
        { name: "quantity", label: "Qty", type: "number", defaultValue: 0 },
      ]}
      columns={["product_id", "size", "color", "sku", "barcode", "quantity"]}
      rows={rows}
    />
  );
}

/** Matches real serials/page.tsx */
export function ElectronicsSerialsDemo() {
  const rows = useMemo(
    () => [
      {
        id: "s1",
        product_id: "iPhone 15",
        serial_number: "356938035643809",
        status: "in_stock",
        created_at: "2026-07-20T10:00:00+08:00",
      },
      {
        id: "s2",
        product_id: "Samsung A55",
        serial_number: "R58T30ABCDE",
        status: "sold",
        created_at: "2026-07-28T14:30:00+08:00",
      },
      {
        id: "s3",
        product_id: "Laptop Pro 14",
        serial_number: "C02YL0ABCD",
        status: "in_stock",
        created_at: "2026-08-03T09:20:00+08:00",
      },
    ],
    []
  );
  return (
    <NicheModuleExactDemo
      title="Serial / IMEI"
      subtitle="Track serialised electronics units."
      fields={[
        { name: "product_id", label: "Product ID" },
        { name: "serial_number", label: "Serial / IMEI" },
      ]}
      columns={["product_id", "serial_number", "status", "created_at"]}
      rows={rows}
    />
  );
}

/** Matches real price-tiers/page.tsx */
export function WholesalePriceTiersDemo() {
  const rows = useMemo(
    () => [
      {
        id: "pt1",
        name: "Silver",
        discount_percent: 5,
        created_at: "2026-05-01T09:00:00+08:00",
      },
      {
        id: "pt2",
        name: "Gold",
        discount_percent: 10,
        created_at: "2026-05-01T09:00:00+08:00",
      },
      {
        id: "pt3",
        name: "Platinum",
        discount_percent: 15,
        created_at: "2026-06-15T11:00:00+08:00",
      },
    ],
    []
  );
  return (
    <NicheModuleExactDemo
      title="Price tiers"
      subtitle="Wholesale customer discount tiers."
      fields={[
        { name: "name", label: "Tier name" },
        { name: "discount_percent", label: "Discount %", type: "number", defaultValue: 0 },
      ]}
      columns={["name", "discount_percent", "created_at"]}
      rows={rows}
    />
  );
}
