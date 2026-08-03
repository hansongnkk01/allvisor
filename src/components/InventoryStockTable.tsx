"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { ActionForm } from "@/components/ActionForm";
import { adjustStockAction, bulkAdjustStockAction } from "@/app/actions";
import { ListPager, SearchField, useClientPager } from "@/components/ListControls";
import { useInventoryHid } from "@/components/InventoryHidProvider";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { LoadingOverlay } from "@/components/LoadingOverlay";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit_price: number;
  quantity: number;
  low_stock_threshold: number;
  sold_by: string;
  available_to_sale: boolean;
  track_stock: boolean;
  price_on_sale: boolean;
  category: string | null;
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
    barcode: string;
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
  const hid = useInventoryHid();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState<"in" | "out">("in");
  const [bulkQty, setBulkQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((p) =>
      [p.name, p.sku, p.barcode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [products, q]);
  const pager = useClientPager(filtered, 10);

  const allIds = useMemo(() => pager.slice.map((p) => p.id), [pager.slice]);
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
      <SearchField
        value={q}
        onChange={(v) => {
          setQ(v);
          pager.setPage(1);
        }}
        placeholder="Search item…"
        data-inventory-search
        inputRef={(el) => {
          hid?.registerSearch(el, (next) => {
            setQ(next);
            pager.setPage(1);
          });
        }}
      />
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
              <th>{labels.barcode}</th>
              <th>{labels.price}</th>
              <th>{labels.qty}</th>
              <th>Retail</th>
              <th>Category</th>
              <th>{labels.addedAt}</th>
              <th>{labels.adjust}</th>
            </tr>
          </thead>
          <tbody>
            {pager.slice.map((p) => (
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
                <td>{p.barcode || "—"}</td>
                <td>{p.price_on_sale ? "At sale" : formatCurrency(Number(p.unit_price))}</td>
                <td>{p.track_stock ? p.quantity : "Not tracked"}</td>
                <td>
                  <span className="badge">{p.sold_by}</span>{" "}
                  {!p.available_to_sale ? <span className="badge">POS off</span> : null}
                </td>
                <td>{p.category || "—"}</td>
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
            {!filtered.length ? (
              <tr>
                <td colSpan={10} className="muted">
                  {labels.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <ListPager page={pager.page} totalPages={pager.totalPages} onPage={pager.setPage} />
    </div>
  );
}
