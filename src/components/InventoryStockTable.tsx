"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { ActionForm } from "@/components/ActionForm";
import { adjustStockAction, bulkAdjustStockAction } from "@/app/actions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { LoadingOverlay } from "@/components/LoadingOverlay";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  unit_price: number;
  quantity: number;
  low_stock_threshold: number;
  created_at: string;
};

export function InventoryStockTable({
  products,
  labels,
}: {
  products: Product[];
  labels: {
    name: string;
    sku: string;
    price: string;
    qty: string;
    addedAt: string;
    adjust: string;
    empty: string;
    selectAll: string;
    selectItem: string;
    okSelected: string;
  };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState<"in" | "out">("in");
  const [bulkQty, setBulkQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allIds = useMemo(() => products.map((p) => p.id), [products]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allIds.every((id) => prev.has(id))) return new Set();
      return new Set(allIds);
    });
  }

  function runBulk() {
    if (!selected.size) {
      setError("Select at least one item");
      return;
    }
    const fd = new FormData();
    for (const id of selected) fd.append("product_ids", id);
    fd.set("type", bulkType);
    fd.set("quantity", String(bulkQty));
    setError(null);
    startTransition(async () => {
      const result = await bulkAdjustStockAction(fd);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="stack" style={{ gap: "0.85rem" }}>
      <LoadingOverlay show={pending} label="Updating stock…" />
      <div
        className="row"
        style={{ flexWrap: "wrap", gap: "0.55rem", alignItems: "center" }}
      >
        <label className="row" style={{ gap: 6, fontSize: "0.9rem" }}>
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          {labels.selectAll}
        </label>
        <select
          className="select"
          style={{ width: 100 }}
          value={bulkType}
          onChange={(e) => setBulkType(e.target.value as "in" | "out")}
        >
          <option value="in">in</option>
          <option value="out">out</option>
        </select>
        <input
          className="input"
          type="number"
          min={1}
          value={bulkQty}
          onChange={(e) => setBulkQty(Math.max(1, Number(e.target.value) || 1))}
          style={{ width: 80 }}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending || !selected.size}
          onClick={runBulk}
        >
          {labels.okSelected} ({selected.size})
        </button>
        {error ? (
          <span style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</span>
        ) : null}
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th style={{ width: 40 }}>{labels.selectItem}</th>
              <th>{labels.name}</th>
              <th>{labels.sku}</th>
              <th>{labels.price}</th>
              <th>{labels.qty}</th>
              <th>{labels.addedAt}</th>
              <th>{labels.adjust}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    aria-label={`Select ${p.name}`}
                  />
                </td>
                <td>
                  {p.name}{" "}
                  {p.quantity <= p.low_stock_threshold ? (
                    <span className="badge">low</span>
                  ) : null}
                </td>
                <td>{p.sku || "—"}</td>
                <td>{formatCurrency(Number(p.unit_price))}</td>
                <td>{p.quantity}</td>
                <td>{formatDateTime(p.created_at)}</td>
                <td>
                  <ActionForm action={adjustStockAction} className="row">
                    <input type="hidden" name="product_id" value={p.id} />
                    <select name="type" className="select" style={{ width: 100 }}>
                      <option value="in">in</option>
                      <option value="out">out</option>
                    </select>
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      defaultValue={1}
                      className="input"
                      style={{ width: 80 }}
                    />
                    <button
                      type="submit"
                      className="btn btn-ghost"
                      style={{ padding: "0.45rem 0.8rem" }}
                    >
                      OK
                    </button>
                  </ActionForm>
                </td>
              </tr>
            ))}
            {!products.length ? (
              <tr>
                <td colSpan={7} className="muted">
                  {labels.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
