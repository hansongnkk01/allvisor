"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { addInvoiceCostAction, removeInvoiceLineAction } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import type { InvoiceLineKind } from "@/lib/types";

type Line = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  line_kind?: InvoiceLineKind | string | null;
};

type InventoryItem = {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
};

export function InvoiceCostPanel({
  invoiceId,
  lines,
  products = [],
  editable,
  serviceChargePercent,
  labels,
  onUpdated,
}: {
  invoiceId: string;
  lines: Line[];
  products?: InventoryItem[];
  editable: boolean;
  serviceChargePercent: number;
  onUpdated?: () => void;
  labels: {
    description: string;
    qty: string;
    price: string;
    amount: string;
    medicine: string;
    additional: string;
    service: string;
    serviceCharge: string;
    addCost: string;
    remove: string;
    costKind: string;
    costDesc: string;
    costAmount: string;
    costItem: string;
    costQty: string;
    extrasHint: string;
    noInventory: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<"medicine" | "additional">("medicine");
  const [productId, setProductId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const inStock = useMemo(
    () => products.filter((p) => Number(p.quantity) > 0),
    [products]
  );

  const selectedProduct = useMemo(
    () => inStock.find((p) => p.id === productId) || null,
    [inStock, productId]
  );

  // Bill list: service + optional medicine/additional only (service tax is shown under totals)
  const billLines = useMemo(
    () => lines.filter((l) => l.line_kind !== "service_charge"),
    [lines]
  );

  function kindLabel(k?: string | null) {
    if (k === "medicine") return labels.medicine;
    if (k === "additional") return labels.additional;
    return labels.service;
  }

  function addCost() {
    const fd = new FormData();
    fd.set("invoice_id", invoiceId);
    fd.set("cost_kind", kind);
    if (kind === "medicine") {
      fd.set("product_id", productId);
      fd.set("quantity", amount);
    } else {
      fd.set("description", description);
      fd.set("amount", amount);
    }
    setError(null);
    startTransition(async () => {
      const result = await addInvoiceCostAction(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setProductId("");
      setDescription("");
      setAmount("");
      onUpdated?.();
      router.refresh();
    });
  }

  function removeLine(lineId: string) {
    const fd = new FormData();
    fd.set("invoice_id", invoiceId);
    fd.set("line_id", lineId);
    setError(null);
    startTransition(async () => {
      const result = await removeInvoiceLineAction(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      onUpdated?.();
      router.refresh();
    });
  }

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <LoadingOverlay show={pending} label="Updating invoice…" />
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{labels.description}</th>
              <th>{labels.qty}</th>
              <th>{labels.price}</th>
              <th>{labels.amount}</th>
              {editable ? <th className="no-print" /> : null}
            </tr>
          </thead>
          <tbody>
            {billLines.map((line) => {
              const removable =
                editable &&
                (line.line_kind === "medicine" || line.line_kind === "additional");
              return (
                <tr key={line.id}>
                  <td>
                    <div>{line.description}</div>
                    <div className="muted no-print" style={{ fontSize: "0.75rem" }}>
                      {kindLabel(line.line_kind)}
                    </div>
                  </td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(Number(line.unit_price))}</td>
                  <td>{formatCurrency(Number(line.line_total))}</td>
                  {editable ? (
                    <td className="no-print" style={{ textAlign: "right" }}>
                      {removable ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{
                            padding: "0.3rem 0.65rem",
                            fontSize: "0.82rem",
                            color: "var(--danger)",
                          }}
                          onClick={() => removeLine(line.id)}
                          disabled={pending}
                        >
                          {labels.remove}
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {!billLines.length ? (
              <tr>
                <td colSpan={editable ? 5 : 4} className="muted">
                  —
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editable ? (
        <div className="surface no-print" style={{ padding: "1rem", boxShadow: "none" }}>
          <h3 style={{ marginTop: 0, marginBottom: 6 }}>{labels.addCost}</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            {labels.extrasHint} · {labels.serviceCharge}: {serviceChargePercent}%
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0.65rem",
            }}
          >
            <div className="field">
              <label>{labels.costKind}</label>
              <select
                className="select"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as "medicine" | "additional");
                  setProductId("");
                  setDescription("");
                  setAmount("");
                  setError(null);
                }}
              >
                <option value="medicine">{labels.medicine}</option>
                <option value="additional">{labels.additional}</option>
              </select>
            </div>
            {kind === "medicine" ? (
              <>
                <div className="field">
                  <label>{labels.costItem}</label>
                  <select
                    className="select"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                  >
                    <option value="">—</option>
                    {inStock.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {formatCurrency(p.unit_price)} · stock {p.quantity}
                      </option>
                    ))}
                  </select>
                  {!inStock.length ? (
                    <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
                      {labels.noInventory}
                    </p>
                  ) : null}
                </div>
                <div className="field">
                  <label>{labels.costQty}</label>
                  <input
                    className="input"
                    type="number"
                    step="1"
                    min={1}
                    max={selectedProduct?.quantity || undefined}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label>{labels.costDesc}</label>
                  <input
                    className="input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Inspection"
                  />
                </div>
                <div className="field">
                  <label>{labels.costAmount}</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min={0}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          {error ? (
            <p style={{ color: "var(--danger)", margin: "0.5rem 0 0" }}>{error}</p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: "0.75rem" }}
            disabled={pending}
            onClick={addCost}
          >
            {labels.addCost}
          </button>
        </div>
      ) : null}
    </div>
  );
}
