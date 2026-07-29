"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/ActionForm";

type CustomerOption = { id: string; name: string };

type Line = {
  description: string;
  quantity: number;
  unit_price: number;
};

export function MultiLineInvoiceForm({
  customers,
  labels,
  action,
}: {
  customers: CustomerOption[];
  labels: {
    customer: string;
    lines: string;
    description: string;
    qty: string;
    unitPrice: string;
    tax: string;
    save: string;
    addLine: string;
    removeLine: string;
    subtotal: string;
    total: string;
  };
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean } | void>;
}) {
  const [lines, setLines] = useState<Line[]>([
    { description: "Consultation", quantity: 1, unit_price: 0 },
  ]);
  const [tax, setTax] = useState(0);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0),
    [lines]
  );
  const total = subtotal + tax;

  return (
    <ActionForm
      action={action}
      className="stack"
      onSuccess={() => {
        setLines([{ description: "Consultation", quantity: 1, unit_price: 0 }]);
        setTax(0);
      }}
    >
      <input type="hidden" name="lines_json" value={JSON.stringify(lines)} />
      <input type="hidden" name="tax_amount" value={tax} />

      <div className="field" style={{ maxWidth: 320 }}>
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
                { description: "", quantity: 1, unit_price: 0 },
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
                gridTemplateColumns: "2fr 0.7fr 0.9fr auto",
                gap: "0.5rem",
                alignItems: "end",
              }}
            >
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
                <label>{labels.unitPrice}</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min={0}
                  value={line.unit_price}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setLines((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, unit_price: value } : item
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
