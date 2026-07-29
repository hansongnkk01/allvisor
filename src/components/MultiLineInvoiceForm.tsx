"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import type { PriceListItem } from "@/lib/types";

type CustomerOption = { id: string; name: string };

type Line = {
  description: string;
  quantity: number;
  unit_price: number;
  price_list_item_id: string | null;
};

export function MultiLineInvoiceForm({
  customers,
  priceList,
  labels,
  action,
}: {
  customers: CustomerOption[];
  priceList: PriceListItem[];
  labels: {
    customer: string;
    invoiceNumber: string;
    invoiceTitle: string;
    lines: string;
    description: string;
    qty: string;
    price: string;
    selectPrice: string;
    tax: string;
    save: string;
    addLine: string;
    removeLine: string;
    subtotal: string;
    total: string;
    customNumberHint: string;
  };
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean } | void>;
}) {
  const [lines, setLines] = useState<Line[]>([
    { description: "", quantity: 1, unit_price: 0, price_list_item_id: null },
  ]);
  const [tax, setTax] = useState(0);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0),
    [lines]
  );
  const total = subtotal + tax;

  function applyPrice(index: number, priceId: string) {
    const item = priceList.find((p) => p.id === priceId);
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        if (!item) {
          return { ...line, price_list_item_id: null };
        }
        return {
          ...line,
          price_list_item_id: item.id,
          description: line.description || item.name,
          unit_price: Number(item.unit_price),
        };
      })
    );
  }

  return (
    <ActionForm
      action={action}
      className="stack"
      onSuccess={() => {
        setLines([{ description: "", quantity: 1, unit_price: 0, price_list_item_id: null }]);
        setTax(0);
      }}
    >
      <input type="hidden" name="lines_json" value={JSON.stringify(lines)} />
      <input type="hidden" name="tax_amount" value={tax} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.75rem",
        }}
      >
        <div className="field">
          <label>{labels.customer}</label>
          <select name="customer_id" className="select">
            <option value="">—</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{labels.invoiceNumber}</label>
          <input
            name="invoice_number"
            className="input"
            placeholder={labels.customNumberHint}
          />
        </div>
        <div className="field">
          <label>{labels.invoiceTitle}</label>
          <input name="title" className="input" placeholder="Consultation invoice" />
        </div>
      </div>

      <div>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <strong>{labels.lines}</strong>
          <button
            type="button"
            className="btn btn-soft"
            style={{ padding: "0.35rem 0.75rem" }}
            onClick={() =>
              setLines((prev) => [
                ...prev,
                { description: "", quantity: 1, unit_price: 0, price_list_item_id: null },
              ])
            }
          >
            {labels.addLine}
          </button>
        </div>

        <div className="stack" style={{ gap: "0.65rem" }}>
          {lines.map((line, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1.6fr 0.6fr 0.8fr auto",
                gap: "0.5rem",
                alignItems: "end",
              }}
            >
              <div className="field">
                <label>{labels.price}</label>
                <select
                  className="select"
                  value={line.price_list_item_id || ""}
                  onChange={(e) => applyPrice(index, e.target.value)}
                >
                  <option value="">{labels.selectPrice}</option>
                  {priceList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — RM {Number(p.unit_price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{labels.description}</label>
                <input
                  className="input"
                  value={line.description}
                  required
                  onChange={(e) => {
                    const value = e.target.value;
                    setLines((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, description: value } : item
                      )
                    );
                  }}
                />
              </div>
              <div className="field">
                <label>{labels.qty}</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min={0}
                  value={line.quantity}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setLines((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, quantity: value } : item
                      )
                    );
                  }}
                />
              </div>
              <div className="field">
                <label>{labels.price}</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min={0}
                  value={line.unit_price}
                  readOnly={Boolean(line.price_list_item_id)}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setLines((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? { ...item, unit_price: value, price_list_item_id: null }
                          : item
                      )
                    );
                  }}
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "0.55rem 0.7rem" }}
                disabled={lines.length <= 1}
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
              >
                {labels.removeLine}
              </button>
            </div>
          ))}
        </div>
        {!priceList.length ? (
          <p className="muted" style={{ marginTop: 8, fontSize: "0.85rem" }}>
            Add prices in Admin → Price list first for dropdown options.
          </p>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          alignItems: "end",
        }}
      >
        <div className="field">
          <label>{labels.tax}</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min={0}
            value={tax}
            onChange={(e) => setTax(Number(e.target.value))}
          />
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {labels.subtotal}
          </div>
          <strong>RM {subtotal.toFixed(2)}</strong>
        </div>
        <div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {labels.total}
          </div>
          <strong>RM {total.toFixed(2)}</strong>
        </div>
      </div>

      <button type="submit" className="btn btn-primary">
        {labels.save}
      </button>
    </ActionForm>
  );
}
