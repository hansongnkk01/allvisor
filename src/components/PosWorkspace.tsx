"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { posCheckoutAction } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";

export type PosProduct = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit_price: number;
  quantity: number;
};

type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  stock: number;
  qty: number;
};

type Labels = {
  search: string;
  searchHint: string;
  cart: string;
  total: string;
  qty: string;
  customer: string;
  payment: string;
  cash: string;
  card: string;
  ewallet: string;
  transfer: string;
  checkout: string;
  emptyCart: string;
  add: string;
  remove: string;
  frequent: string;
  stock: string;
  success: string;
  checkingOut: string;
};

function barcodePrefixMatches(products: PosProduct[], needle: string) {
  return products.filter((p) => {
    if (p.quantity <= 0) return false;
    const bc = (p.barcode || "").trim();
    const sku = (p.sku || "").trim();
    return (bc && bc.startsWith(needle)) || (sku && sku.startsWith(needle));
  });
}

export function PosWorkspace({
  products,
  frequentIds,
  customers,
  labels,
}: {
  products: PosProduct[];
  frequentIds: string[];
  customers: Array<{ id: string; name: string }>;
  labels: Labels;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const queryRef = useRef("");
  const productsRef = useRef(products);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [method, setMethod] = useState("cash");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  productsRef.current = products;
  queryRef.current = query;

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const frequent = useMemo(
    () =>
      frequentIds
        .map((id) => byId.get(id))
        .filter((p): p is PosProduct => !!p && p.quantity > 0)
        .slice(0, 12),
    [frequentIds, byId]
  );

  const filtered = useMemo(() => {
    const needle = query.trim();
    if (!needle) return products.filter((p) => p.quantity > 0).slice(0, 40);

    if (/^\d+$/.test(needle)) {
      return barcodePrefixMatches(products, needle).slice(0, 40);
    }

    const q = needle.toLowerCase();
    return products
      .filter((p) => {
        const hay = [p.name, p.sku, p.barcode]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [products, query]);

  const total = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  function addProduct(p: PosProduct, qty = 1) {
    setError(null);
    setOkMsg(null);
    if (p.quantity <= 0) {
      setError("Out of stock");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        const nextQty = Math.min(p.quantity, existing.qty + qty);
        return prev.map((l) =>
          l.productId === p.id ? { ...l, qty: nextQty, stock: p.quantity } : l
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          unitPrice: Number(p.unit_price),
          stock: p.quantity,
          qty: Math.min(qty, p.quantity),
        },
      ];
    });
  }

  function applySearch(value: string, catalog: PosProduct[] = products) {
    const needle = value.trim();
    if (/^\d+$/.test(needle)) {
      const matches = barcodePrefixMatches(catalog, needle);
      if (matches.length === 1) {
        addProduct(matches[0], 1);
        setQuery("");
        queueMicrotask(() => searchRef.current?.focus());
        return;
      }
    }
    setQuery(value);
  }

  function setLineQty(productId: string, qty: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const next = Math.max(0, Math.min(l.stock, Math.floor(qty) || 0));
          return { ...l, qty: next };
        })
        .filter((l) => l.qty > 0)
    );
  }

  function tryScanAdd() {
    const needle = query.trim().toLowerCase();
    if (!needle) return;
    const exact =
      products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === needle) ||
          (p.sku && p.sku.toLowerCase() === needle)
      ) ||
      products.find((p) => p.name.toLowerCase() === needle);
    if (exact) {
      addProduct(exact, 1);
      setQuery("");
      searchRef.current?.focus();
    }
  }

  function checkout() {
    if (!cart.length) {
      setError(labels.emptyCart);
      return;
    }
    setError(null);
    setOkMsg(null);
    const fd = new FormData();
    fd.set(
      "cart_json",
      JSON.stringify(
        cart.map((l) => ({ product_id: l.productId, quantity: l.qty }))
      )
    );
    if (customerId) fd.set("customer_id", customerId);
    fd.set("payment_method", method);

    startTransition(async () => {
      const res = await posCheckoutAction(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      setCart([]);
      setCustomerId("");
      setMethod("cash");
      setOkMsg(labels.success);
      router.refresh();
      searchRef.current?.focus();
    });
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!/^[0-9]$/.test(e.key)) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable;
      const isSearch = searchRef.current === target;

      // Don't steal digits from qty / other form fields
      if (isEditable && !isSearch) return;
      if (isSearch) return; // normal onChange handles digits in the search box

      e.preventDefault();
      searchRef.current?.focus();
      const trimmed = queryRef.current.trim();
      const next = !trimmed || /^\d+$/.test(trimmed) ? trimmed + e.key : e.key;
      applySearch(next, productsRef.current);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="pos-grid">
      <div className="stack" style={{ gap: "0.85rem" }}>
        <div className="surface" style={{ padding: "1rem 1.15rem" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{labels.search}</label>
            <input
              ref={searchRef}
              className="input"
              value={query}
              placeholder={labels.searchHint}
              autoFocus
              onChange={(e) => applySearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  tryScanAdd();
                }
              }}
            />
          </div>
        </div>

        {frequent.length ? (
          <div className="surface" style={{ padding: "1rem 1.15rem" }}>
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 8 }}>
              {labels.frequent}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "0.5rem",
              }}
            >
              {frequent.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="btn btn-soft"
                  style={{
                    display: "block",
                    textAlign: "left",
                    padding: "0.65rem 0.75rem",
                    height: "auto",
                    borderRadius: 12,
                  }}
                  onClick={() => addProduct(p, 1)}
                >
                  <div style={{ fontWeight: 650, fontSize: "0.9rem" }}>{p.name}</div>
                  <div className="muted" style={{ fontSize: "0.78rem", marginTop: 2 }}>
                    {formatCurrency(Number(p.unit_price))} · {labels.stock} {p.quantity}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="surface" style={{ padding: "1rem 1.15rem" }}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>{labels.stock}</th>
                  <th>Price</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="muted" style={{ fontSize: "0.75rem" }}>
                        {[p.sku, p.barcode].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </td>
                    <td>{p.quantity}</td>
                    <td>{formatCurrency(Number(p.unit_price))}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn btn-soft"
                        style={{ padding: "0.35rem 0.7rem" }}
                        disabled={p.quantity <= 0}
                        onClick={() => addProduct(p, 1)}
                      >
                        {labels.add}
                      </button>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      —
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.15rem", position: "sticky", top: "1rem" }}>
        <h3 style={{ marginTop: 0 }}>{labels.cart}</h3>
        {!cart.length ? (
          <p className="muted">{labels.emptyCart}</p>
        ) : (
          <div className="stack" style={{ gap: "0.65rem" }}>
            {cart.map((l) => (
              <div
                key={l.productId}
                style={{
                  borderBottom: "1px solid var(--line)",
                  paddingBottom: 8,
                }}
              >
                <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: "0.95rem" }}>{l.name}</strong>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                    onClick={() => setLineQty(l.productId, 0)}
                  >
                    {labels.remove}
                  </button>
                </div>
                <div className="row" style={{ marginTop: 6, gap: 8 }}>
                  <label className="muted" style={{ fontSize: "0.8rem" }}>
                    {labels.qty}
                  </label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={l.stock}
                    value={l.qty}
                    style={{ width: 72, padding: "0.35rem 0.5rem" }}
                    onChange={(e) => setLineQty(l.productId, Number(e.target.value))}
                  />
                  <span style={{ marginLeft: "auto", fontWeight: 650 }}>
                    {formatCurrency(l.unitPrice * l.qty)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          className="row"
          style={{
            justifyContent: "space-between",
            marginTop: "1rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--line)",
          }}
        >
          <strong>{labels.total}</strong>
          <strong style={{ fontSize: "1.25rem" }}>{formatCurrency(total)}</strong>
        </div>

        <div className="field" style={{ marginTop: "0.85rem" }}>
          <label>{labels.customer}</label>
          <select
            className="select"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">—</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>{labels.payment}</label>
          <select
            className="select"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="cash">{labels.cash}</option>
            <option value="card">{labels.card}</option>
            <option value="ewallet">{labels.ewallet}</option>
            <option value="transfer">{labels.transfer}</option>
          </select>
        </div>

        {error ? (
          <p style={{ color: "var(--danger)", margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
            {error}
          </p>
        ) : null}
        {okMsg ? (
          <p style={{ color: "var(--success)", margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
            {okMsg}
          </p>
        ) : null}

        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%", marginTop: "0.85rem" }}
          disabled={pending || !cart.length}
          onClick={checkout}
        >
          {pending ? labels.checkingOut : labels.checkout}
        </button>
      </div>
    </div>
  );
}
