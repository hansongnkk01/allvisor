"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/PageHeader";
import { PrintInvoiceButton } from "@/components/PrintInvoiceButton";
import {
  BluetoothStubButton,
  ReceiptTestButton,
  StickerTestButton,
} from "@/components/PrinterTestButtons";
import { SectionActivityLog } from "@/components/SectionActivityLog";
import {
  demoCustomers,
  demoInvoices,
  demoProductCategories,
  demoProducts,
} from "@/lib/demo-dashboard-data";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Niche } from "@/lib/types";

function DemoNoopForm({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <form
      className={className}
      style={style}
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={headers.length} className="muted">
                  No records yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Matches real cash/page.tsx empty-session layout. */
export function CashExactDemo() {
  const t = useTranslations("RetailPages");
  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("cashTitle")} subtitle={t("cashSubtitle")} />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Open cash session</h3>
        <DemoNoopForm className="row">
          <div className="field">
            <label>Opening float</label>
            <input className="input" name="opening_float" type="number" min="0" step=".01" defaultValue="0" readOnly />
          </div>
          <button className="btn btn-primary" type="submit">
            Open drawer
          </button>
        </DemoNoopForm>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Session history</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Opened</th>
                <th>Staff</th>
                <th>Status</th>
                <th>Expected</th>
                <th>Counted</th>
                <th>Variance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="muted">
                  No records yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Matches real categories/page.tsx */
export function CategoriesExactDemo({ niche }: { niche: Niche }) {
  const t = useTranslations("RetailPages");
  const topLevel = useMemo(
    () => [
      { id: "pc-elec", name: "Electronics", parent_id: null as string | null, count: 0 },
      { id: "pc-bev", name: "Beverages", parent_id: null, count: 0 },
      { id: "pc-snack", name: "Snacks", parent_id: null, count: 0 },
      { id: "pc-hw", name: "Hardware", parent_id: null, count: 3 },
      { id: "pc-house", name: "Household", parent_id: null, count: 1 },
      { id: "pc-stat", name: "Stationery", parent_id: null, count: 0 },
    ],
    []
  );
  const categories = useMemo(
    () => [
      ...topLevel,
      { id: "pc-batt", name: "Batteries", parent_id: "pc-elec", count: 1 },
      { id: "pc-cable", name: "Cables", parent_id: "pc-elec", count: 2 },
      { id: "pc-coffee", name: "Coffee", parent_id: "pc-bev", count: 1 },
      { id: "pc-soft", name: "Soft drinks", parent_id: "pc-bev", count: 1 },
      { id: "pc-bisc", name: "Biscuits", parent_id: "pc-snack", count: 1 },
      { id: "pc-chips", name: "Chips", parent_id: "pc-snack", count: 1 },
      { id: "pc-choc", name: "Chocolate", parent_id: "pc-snack", count: 1 },
      { id: "pc-clean", name: "Cleaning", parent_id: "pc-house", count: 1 },
      { id: "pc-fast", name: "Fasteners", parent_id: "pc-hw", count: 1 },
      { id: "pc-note", name: "Notebooks", parent_id: "pc-stat", count: 1 },
    ],
    [topLevel]
  );
  const nameById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const products = useMemo(() => {
    const base = demoProducts(niche);
    return [
      { id: "p-air", name: "Air Mineral 500ml", sku: "SKU-AIR", category_id: "pc-soft" },
      { id: "p-valve", name: "Ball Valve 1/2", sku: "SKU-VALVE", category_id: "pc-hw" },
      { id: "p-batt", name: "Battery AA 4pcs", sku: "SKU-BATT", category_id: "pc-batt" },
      { id: "p-biskut", name: "Biskut Coklat", sku: "SKU-BISKUT", category_id: "pc-bisc" },
      { id: "p-chips", name: "Chips BBQ", sku: "SKU-CHIPS", category_id: "pc-chips" },
      { id: "p-choc", name: "Chocolate Bar", sku: "SKU-CHOC", category_id: "pc-choc" },
      { id: "p-cola", name: "Cola Can 330ml", sku: "SKU-COLA", category_id: "pc-soft" },
      { id: "p-cable", name: "Custom cable cut", sku: "SKU-CUSTOM", category_id: "pc-cable" },
      { id: "p-dish", name: "Dish Soap 500ml", sku: "SKU-DISH", category_id: "pc-clean" },
      ...base.slice(0, 2).map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || "—",
        category_id: p.category_id,
      })),
    ];
  }, [niche]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("categoriesTitle")} subtitle={t("categoriesSubtitle")} />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Create category</h3>
        <DemoNoopForm className="row" style={{ flexWrap: "wrap" }}>
          <input className="input" name="name" placeholder="Category name" style={{ maxWidth: 260 }} readOnly />
          <select className="select" name="parent_id" defaultValue="" style={{ maxWidth: 260 }} disabled>
            <option value="">Top-level category</option>
            {topLevel.map((category) => (
              <option key={category.id} value={category.id}>
                Subcategory of {category.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit">
            Create
          </button>
        </DemoNoopForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Categories</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Parent</th>
                <th>Products</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    <strong>{category.name}</strong>
                  </td>
                  <td>{category.parent_id ? nameById.get(category.parent_id) || "—" : "—"}</td>
                  <td>{category.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Bulk assign products</h3>
        <DemoNoopForm className="stack">
          <div className="row" style={{ flexWrap: "wrap" }}>
            <select className="select" name="category_id" defaultValue="" style={{ maxWidth: 300 }} disabled>
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.parent_id ? `${nameById.get(category.parent_id)} / ` : ""}
                  {category.name}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" type="submit">
              Assign selected
            </button>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current category</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <input type="checkbox" disabled aria-label={`Select ${product.name}`} />
                    </td>
                    <td>{product.name}</td>
                    <td>{product.sku || "—"}</td>
                    <td>
                      {product.category_id
                        ? nameById.get(product.category_id) ||
                          demoProductCategories().find((c) => c.id === product.category_id)?.name ||
                          "—"
                        : "Uncategorized"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DemoNoopForm>
      </div>
    </div>
  );
}

/** Matches real receipts/page.tsx */
export function ReceiptsExactDemo({ niche, orgName }: { niche: Niche; orgName: string }) {
  const t = useTranslations("RetailPages");
  const customers = useMemo(() => demoCustomers(niche), [niche]);
  const receipts = useMemo(() => {
    const inv = demoInvoices(niche).filter((i) => i.status === "paid" || i.amount_paid > 0);
    return inv.map((r, idx) => ({
      id: r.id,
      invoice_number: r.invoice_number,
      total: r.total,
      created_at: r.created_at,
      created_by_name: "Reception Lina",
      customer_name: r.customers?.name || customers[idx % customers.length]?.name || "Walk-in",
      lines: [
        {
          id: `${r.id}-l1`,
          description: r.title || "Item",
          quantity: 1,
          unit_price: r.total,
          line_total: r.total,
        },
      ],
      payments: [{ method: "cash", amount: r.amount_paid || r.total }],
    }));
  }, [niche, customers]);
  const [selectedId, setSelectedId] = useState(receipts[0]?.id || "");
  const selected = receipts.find((r) => r.id === selectedId) || null;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("receiptsTitle")} subtitle={t("receiptsSubtitle")} />
      <form
        className="surface row"
        style={{ padding: "1rem", flexWrap: "wrap" }}
        onSubmit={(e) => e.preventDefault()}
      >
        <input className="input" type="date" name="from" aria-label="From date" readOnly />
        <input className="input" type="date" name="to" aria-label="To date" readOnly />
        <select className="select" name="employee" defaultValue="" disabled>
          <option value="">All employees</option>
          <option value="Reception Lina">Reception Lina</option>
        </select>
        <select className="select" name="customer" defaultValue="" disabled>
          <option value="">All customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit">
          Filter
        </button>
      </form>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, .8fr) minmax(360px, 1.2fr)",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        <div className="surface" style={{ padding: "1rem" }}>
          <div className="stack" style={{ gap: ".5rem" }}>
            {receipts.map((receipt) => (
              <button
                key={receipt.id}
                type="button"
                className="btn btn-soft"
                style={{ display: "block", textAlign: "left", height: "auto", padding: ".75rem" }}
                onClick={() => setSelectedId(receipt.id)}
                data-active={selectedId === receipt.id ? "true" : "false"}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{receipt.invoice_number}</strong>
                  <strong>{formatCurrency(Number(receipt.total))}</strong>
                </div>
                <div className="muted" style={{ fontSize: ".8rem", marginTop: 4 }}>
                  {receipt.customer_name} · {receipt.created_by_name} · {formatDateTime(receipt.created_at)}
                </div>
              </button>
            ))}
            {!receipts.length ? <p className="muted">No paid receipts match these filters.</p> : null}
          </div>
        </div>

        <div className="surface invoice-print-area" style={{ padding: "1.25rem" }}>
          {selected ? (
            <>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <h2 style={{ margin: 0 }}>Receipt {selected.invoice_number}</h2>
                  <p className="muted">{formatDateTime(selected.created_at)}</p>
                </div>
                <PrintInvoiceButton label="Print receipt" invoiceId={selected.id} demoMode />
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((line) => (
                      <tr key={line.id}>
                        <td>{line.description}</td>
                        <td>{Number(line.quantity)}</td>
                        <td>{formatCurrency(Number(line.unit_price))}</td>
                        <td>{formatCurrency(Number(line.line_total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row" style={{ justifyContent: "space-between", marginTop: "1rem", fontSize: "1.1rem" }}>
                <strong>Total</strong>
                <strong>{formatCurrency(Number(selected.total))}</strong>
              </div>
              <p className="muted" style={{ fontSize: ".85rem" }}>
                Payment:{" "}
                {selected.payments
                  .map((p) => `${p.method} ${formatCurrency(Number(p.amount))}`)
                  .join(", ") || "—"}
              </p>
              <div className="row" style={{ marginTop: "1rem", flexWrap: "wrap" }}>
                <button type="button" className="btn btn-soft">
                  Open invoice
                </button>
                <DemoNoopForm className="row">
                  <input
                    className="input"
                    name="note"
                    defaultValue={`Refund ${selected.invoice_number}`}
                    aria-label="Refund note"
                    readOnly
                  />
                  <button className="btn btn-ghost" type="submit">
                    Refund full receipt
                  </button>
                </DemoNoopForm>
              </div>
            </>
          ) : (
            <p className="muted">Select a receipt.</p>
          )}
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
        Demo · {orgName}
      </p>
    </div>
  );
}

/** Matches real logistics/page.tsx */
export function LogisticsExactDemo() {
  const t = useTranslations("RetailPages");
  const tabs = ["suppliers", "grn", "adjustments", "transfers"] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>("suppliers");
  const products = demoProducts("retail");

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("logisticsTitle")} subtitle={t("logisticsSubtitle")} />
      <div className="row" style={{ flexWrap: "wrap" }}>
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            className={`btn ${tab === name ? "btn-primary" : "btn-soft"}`}
            onClick={() => setTab(name)}
          >
            {name === "grn" ? "GRN" : name[0].toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>

      {tab === "suppliers" ? (
        <>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Add supplier</h3>
            <DemoNoopForm className="row" style={{ flexWrap: "wrap" }}>
              <input className="input" name="name" placeholder="Supplier name" readOnly />
              <input className="input" name="phone" placeholder="Phone" readOnly />
              <input className="input" name="email" type="email" placeholder="Email" readOnly />
              <input className="input" name="address" placeholder="Address" readOnly />
              <button className="btn btn-primary" type="submit">
                Add supplier
              </button>
            </DemoNoopForm>
          </div>
          <SimpleTable
            headers={["Supplier", "Phone", "Email", "Address"]}
            rows={[
              ["MedSupply Sdn Bhd", "03-8899 1122", "orders@medsupply.my", "Shah Alam"],
              ["BulkTrade Asia", "03-2200 4455", "sales@bulktrade.my", "PJ"],
            ]}
          />
        </>
      ) : null}

      {tab === "grn" ? (
        <>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Receive goods</h3>
            <DemoNoopForm className="stack">
              <select className="select" defaultValue="" disabled>
                <option value="">No supplier</option>
                <option>MedSupply Sdn Bhd</option>
              </select>
              <input className="input" placeholder="GRN notes" readOnly />
              <select className="select" disabled>
                {products.map((p) => (
                  <option key={p.id}>{p.name}</option>
                ))}
              </select>
              <input className="input" type="number" placeholder="Qty" readOnly />
              <button className="btn btn-primary" type="submit">
                Post GRN
              </button>
            </DemoNoopForm>
          </div>
          <SimpleTable
            headers={["GRN", "Supplier", "Status", "Received"]}
            rows={[["GRN-220", "MedSupply Sdn Bhd", "posted", "4 Aug 2026"]]}
          />
        </>
      ) : null}

      {tab === "adjustments" ? (
        <>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Stock adjustment document</h3>
            <DemoNoopForm className="stack">
              <input className="input" name="reason" placeholder="Reason" readOnly />
              <input className="input" name="notes" placeholder="Notes" readOnly />
              <button className="btn btn-primary" type="submit">
                Save adjustment
              </button>
            </DemoNoopForm>
          </div>
          <SimpleTable
            headers={["Document", "Reason", "Staff", "Created"]}
            rows={[["ADJ-44", "Damaged stock", "Reception Lina", "3 Aug 2026"]]}
          />
        </>
      ) : null}

      {tab === "transfers" ? (
        <>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Transfer stock out</h3>
            <DemoNoopForm className="stack">
              <div className="row">
                <input className="input" name="from_location" defaultValue="main" placeholder="From location" readOnly />
                <input className="input" name="to_location" placeholder="To location" readOnly />
              </div>
              <input className="input" name="notes" placeholder="Notes" readOnly />
              <button className="btn btn-primary" type="submit">
                Create transfer
              </button>
            </DemoNoopForm>
          </div>
          <SimpleTable
            headers={["Transfer", "From", "To", "Status", "Created"]}
            rows={[["TR-12", "main", "Branch B", "sent", "2 Aug 2026"]]}
          />
        </>
      ) : null}
    </div>
  );
}

/** Matches real printers/page.tsx */
export function PrintersExactDemo() {
  const t = useTranslations("RetailPages");
  const receiptWidth = 80;
  const stickerWidth = 40;
  const stickerHeight = 30;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("printersTitle")} subtitle={t("printersSubtitle")} />
      <DemoNoopForm className="stack">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
          <div className="surface stack" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Receipt printer</h3>
            <input className="input" name="receipt_printer_name" defaultValue="Counter 1" placeholder="Printer name" readOnly />
            <select className="select" name="receipt_connection" defaultValue="browser" disabled>
              <option value="browser">Browser print</option>
              <option value="bluetooth">Bluetooth</option>
              <option value="usb">USB</option>
            </select>
            <div className="field">
              <label>Paper width (mm)</label>
              <input className="input" name="receipt_width" type="number" defaultValue={receiptWidth} readOnly />
            </div>
            <label className="row">
              <input type="checkbox" defaultChecked disabled /> Show logo
            </label>
            <label className="row">
              <input type="checkbox" defaultChecked disabled /> Show address
            </label>
            <div className="field">
              <label>Footer</label>
              <input className="input" name="receipt_footer" defaultValue="Thank you" readOnly />
            </div>
            <div className="row">
              <ReceiptTestButton width={receiptWidth} footer="Thank you" />
              <BluetoothStubButton />
            </div>
          </div>
          <div className="surface stack" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Sticker printer</h3>
            <input className="input" name="sticker_printer_name" defaultValue="Label 1" placeholder="Printer name" readOnly />
            <select className="select" name="sticker_connection" defaultValue="browser" disabled>
              <option value="browser">Browser print</option>
              <option value="bluetooth">Bluetooth</option>
              <option value="usb">USB</option>
            </select>
            <div className="row">
              <div className="field">
                <label>Width (mm)</label>
                <input className="input" type="number" defaultValue={stickerWidth} readOnly />
              </div>
              <div className="field">
                <label>Height (mm)</label>
                <input className="input" type="number" defaultValue={stickerHeight} readOnly />
              </div>
            </div>
            <label className="row">
              <input type="checkbox" defaultChecked disabled /> Product name
            </label>
            <label className="row">
              <input type="checkbox" defaultChecked disabled /> Price
            </label>
            <label className="row">
              <input type="checkbox" defaultChecked disabled /> Barcode text
            </label>
            <div
              style={{
                width: `${stickerWidth}mm`,
                minHeight: `${stickerHeight}mm`,
                border: "1px dashed var(--line)",
                padding: 8,
                textAlign: "center",
                background: "white",
                color: "#111",
              }}
            >
              <strong>Sample Product</strong>
              <div>RM 12.00</div>
              <div style={{ fontFamily: "monospace", marginTop: 4 }}>9551234567890</div>
            </div>
            <div className="row">
              <StickerTestButton width={stickerWidth} height={stickerHeight} />
              <BluetoothStubButton />
            </div>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" style={{ alignSelf: "start" }}>
          Save printer settings
        </button>
      </DemoNoopForm>
    </div>
  );
}

export function DemoActivityBlock({
  title,
  logs,
}: {
  title: string;
  logs: Array<{ id: string; actor_name: string; summary: string; action: string; created_at: string }>;
}) {
  return <SectionActivityLog title={title} logs={logs} pageSize={5} />;
}
