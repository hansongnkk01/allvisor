"use client";

import { useState } from "react";
import { ActionForm, type ActionResult } from "@/components/ActionForm";

type Product = { id: string; name: string; quantity: number };
type Line = { product_id: string; quantity: number; unit_cost?: number };

export function StockDocumentForm({
  products,
  action,
  kind,
  children,
}: {
  products: Product[];
  action: (formData: FormData) => Promise<ActionResult | void>;
  kind: "grn" | "adjustment" | "transfer";
  children?: React.ReactNode;
}) {
  const [lines, setLines] = useState<Line[]>([{ product_id: products[0]?.id || "", quantity: 1, unit_cost: 0 }]);
  const update = (index: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  return (
    <ActionForm action={action} className="stack" onSuccess={() => setLines([{ product_id: products[0]?.id || "", quantity: 1, unit_cost: 0 }])}>
      {children}
      <input type="hidden" name="lines_json" value={JSON.stringify(lines)} />
      {lines.map((line, index) => (
        <div className="row" key={index} style={{ flexWrap: "wrap" }}>
          <select className="select" value={line.product_id} onChange={(event) => update(index, { product_id: event.target.value })} required>
            <option value="">Choose product</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.quantity} on hand)</option>)}
          </select>
          <input
            className="input"
            type="number"
            step=".001"
            value={line.quantity}
            onChange={(event) => update(index, { quantity: Number(event.target.value) })}
            aria-label={kind === "adjustment" ? "Stock delta" : "Quantity"}
            placeholder={kind === "adjustment" ? "Delta (+/-)" : "Quantity"}
            required
          />
          {kind === "grn" ? (
            <input className="input" type="number" min="0" step=".01" value={line.unit_cost || 0} onChange={(event) => update(index, { unit_cost: Number(event.target.value) })} aria-label="Unit cost" placeholder="Unit cost" />
          ) : null}
          {lines.length > 1 ? <button className="btn btn-ghost" type="button" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>Remove</button> : null}
        </div>
      ))}
      <div className="row">
        <button className="btn btn-soft" type="button" onClick={() => setLines((current) => [...current, { product_id: products[0]?.id || "", quantity: 1, unit_cost: 0 }])}>Add line</button>
        <button className="btn btn-primary" type="submit">{kind === "grn" ? "Receive stock" : kind === "adjustment" ? "Post adjustment" : "Send transfer"}</button>
      </div>
    </ActionForm>
  );
}
