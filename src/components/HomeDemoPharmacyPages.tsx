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

const DEMO_PHARMACY_PRODUCTS = [
  { id: "p1", name: "Paracetamol 500mg" },
  { id: "p2", name: "Vitamin C 1000mg" },
  { id: "p3", name: "Amoxicillin 250mg" },
];

/** Matches real batches/page.tsx → NicheModulePage (with product select). */
export function PharmacyBatchesDemo() {
  const products = DEMO_PHARMACY_PRODUCTS;
  const rows = useMemo(
    () => [
      {
        id: "b1",
        lot_number: "B-901",
        product_id: products[0].name,
        expiry_date: "2027-01-01",
        quantity: 120,
      },
      {
        id: "b2",
        lot_number: "B-902",
        product_id: products[1].name,
        expiry_date: "2026-09-01",
        quantity: 40,
      },
      {
        id: "b3",
        lot_number: "B-903",
        product_id: products[2].name,
        expiry_date: "2026-12-15",
        quantity: 80,
      },
    ],
    [products]
  );
  const columns = ["lot_number", "product_id", "expiry_date", "quantity"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Batches / expiry" subtitle="Lot tracking and expiry for pharmacy inventory." />
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
              <label>Product</label>
              <select name="product_id" className="select" defaultValue="" disabled>
                <option value="">—</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Lot number</label>
              <input name="lot_number" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Expiry</label>
              <input name="expiry_date" className="input" type="date" readOnly />
            </div>
            <div className="field">
              <label>Qty</label>
              <input name="quantity" className="input" type="number" defaultValue={0} readOnly />
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
