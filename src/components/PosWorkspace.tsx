"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { posCheckoutAction } from "@/app/actions";
import { savePosTicketAction, voidPosTicketAction } from "@/app/retail-actions";
import {
  attachHidBarcodeListener,
  isEditableTarget,
} from "@/lib/hid-barcode";
import { formatCurrency } from "@/lib/utils";

export type PosProduct = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit_price: number;
  quantity: number;
  sold_by: "each" | "meter" | "kg";
  track_stock: boolean;
  price_on_sale: boolean;
  category_id: string | null;
};

type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  stock: number;
  qty: number;
};

type HeldTicket = {
  id: string;
  ticket_number: string;
  customer_id: string | null;
  payment_method: string | null;
  lines: Array<Omit<CartLine, "stock">>;
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

function findByBarcode(products: PosProduct[], code: string) {
  const needle = code.trim().toLowerCase();
  if (!needle) return null;
  return (
    products.find((p) => (p.barcode || "").trim().toLowerCase() === needle) ||
    products.find((p) => (p.sku || "").trim().toLowerCase() === needle) ||
    null
  );
}

export function PosWorkspace({
  products,
  frequentIds,
  customers,
  categories,
  initialTickets,
  labels,
  demoMode = false,
}: {
  products: PosProduct[];
  frequentIds: string[];
  customers: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  initialTickets: HeldTicket[];
  labels: Labels;
  /** Homepage marketing demo — UI only, no server mutations. */
  demoMode?: boolean;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const productsRef = useRef(products);
  const addProductRef = useRef<(p: PosProduct, qty?: number) => void>(() => {});
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [tickets, setTickets] = useState(initialTickets);
  const [activeTicketId, setActiveTicketId] = useState("");
  const [lastInvoiceId, setLastInvoiceId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [method, setMethod] = useState("cash");
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const frequent = useMemo(
    () =>
      frequentIds
        .map((id) => byId.get(id))
        .filter((p): p is PosProduct => !!p && (!p.track_stock || p.quantity > 0))
        .slice(0, 12),
    [frequentIds, byId]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const inCategory = (p: PosProduct) => !categoryId || p.category_id === categoryId;
    if (!needle) return products.filter((p) => inCategory(p) && (!p.track_stock || p.quantity > 0)).slice(0, 60);
    return products
      .filter((p) => {
        const hay = [p.name, p.sku, p.barcode]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return inCategory(p) && hay.includes(needle);
      })
      .slice(0, 60);
  }, [products, query, categoryId]);

  const total = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  function addProduct(p: PosProduct, qty = 1) {
    setError(null);
    setOkMsg(null);
    if (p.track_stock && p.quantity <= 0) {
      setError("Out of stock");
      return;
    }
    let salePrice = Number(p.unit_price);
    if (p.price_on_sale) {
      const entered = window.prompt(`Enter sale price for ${p.name}`, salePrice ? String(salePrice) : "");
      if (entered === null) return;
      salePrice = Number(entered);
      if (!Number.isFinite(salePrice) || salePrice < 0) {
        setError("Enter a valid sale price");
        return;
      }
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        const nextQty = p.track_stock ? Math.min(p.quantity, existing.qty + qty) : existing.qty + qty;
        return prev.map((l) =>
          l.productId === p.id ? { ...l, qty: nextQty, stock: p.quantity, unitPrice: salePrice } : l
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          unitPrice: salePrice,
          stock: p.track_stock ? p.quantity : Number.MAX_SAFE_INTEGER,
          qty: p.track_stock ? Math.min(qty, p.quantity) : qty,
        },
      ];
    });
  }
  useEffect(() => {
    addProductRef.current = addProduct;
  });

  function setLineQty(productId: string, qty: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const next = Math.max(0, Math.min(l.stock, Number(qty) || 0));
          return { ...l, qty: next };
        })
        .filter((l) => l.qty > 0)
    );
  }

  function tryExactAdd() {
    const needle = query.trim().toLowerCase();
    if (!needle) return;
    const exact =
      findByBarcode(products, needle) ||
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
        cart.map((l) => ({ product_id: l.productId, quantity: l.qty, unit_price: l.unitPrice }))
      )
    );
    if (customerId) fd.set("customer_id", customerId);
    fd.set("payment_method", method);
    if (activeTicketId) fd.set("ticket_id", activeTicketId);

    if (demoMode) {
      setCart([]);
      setCustomerId("");
      setMethod("cash");
      setActiveTicketId("");
      setLastInvoiceId("demo-inv");
      setTickets((current) => current.filter((ticket) => ticket.id !== activeTicketId));
      setOkMsg(labels.success);
      searchRef.current?.focus();
      return;
    }

    startTransition(async () => {
      const res = await posCheckoutAction(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      setCart([]);
      setCustomerId("");
      setMethod("cash");
      setActiveTicketId("");
      setLastInvoiceId("invoiceId" in res && typeof res.invoiceId === "string" ? res.invoiceId : "");
      setTickets((current) => current.filter((ticket) => ticket.id !== activeTicketId));
      setOkMsg(labels.success);
      router.refresh();
      searchRef.current?.focus();
    });
  }

  function newTicket() {
    setCart([]);
    setCustomerId("");
    setMethod("cash");
    setActiveTicketId("");
    setError(null);
    setOkMsg(null);
  }

  function switchTicket(ticket: HeldTicket) {
    setActiveTicketId(ticket.id);
    setCustomerId(ticket.customer_id || "");
    setMethod(ticket.payment_method || "cash");
    setCart(ticket.lines.map((line) => ({
      ...line,
      stock: byId.get(line.productId)?.track_stock === false
        ? Number.MAX_SAFE_INTEGER
        : byId.get(line.productId)?.quantity || line.qty,
    })));
    setOkMsg(null);
    setError(null);
  }

  function holdTicket() {
    if (!cart.length) return setError(labels.emptyCart);
    const fd = new FormData();
    if (activeTicketId) fd.set("ticket_id", activeTicketId);
    const existing = tickets.find((ticket) => ticket.id === activeTicketId);
    if (existing) fd.set("ticket_number", existing.ticket_number);
    if (customerId) fd.set("customer_id", customerId);
    fd.set("payment_method", method);
    fd.set("cart_json", JSON.stringify(cart.map((line) => ({
      product_id: line.productId,
      name: line.name,
      unit_price: line.unitPrice,
      quantity: line.qty,
    }))));
    if (demoMode) {
      const held: HeldTicket = {
        id: activeTicketId || `demo-t-${Date.now()}`,
        ticket_number: existing?.ticket_number || `T-${tickets.length + 100}`,
        customer_id: customerId || null,
        payment_method: method,
        lines: cart.map((line) => ({
          productId: line.productId,
          name: line.name,
          unitPrice: line.unitPrice,
          qty: line.qty,
        })),
      };
      setTickets((current) => [held, ...current.filter((ticket) => ticket.id !== held.id)]);
      newTicket();
      return;
    }
    startTransition(async () => {
      const result = await savePosTicketAction(fd);
      if (result && "error" in result && result.error) return setError(result.error);
      if (result && "ticketId" in result && result.ticketId) {
        const held: HeldTicket = {
          id: result.ticketId,
          ticket_number: result.ticketNumber || "Held",
          customer_id: customerId || null,
          payment_method: method,
          lines: cart.map((line) => ({
            productId: line.productId,
            name: line.name,
            unitPrice: line.unitPrice,
            qty: line.qty,
          })),
        };
        setTickets((current) => [
          held,
          ...current.filter((ticket) => ticket.id !== held.id),
        ]);
      }
      router.refresh();
      newTicket();
    });
  }

  useEffect(() => {
    return attachHidBarcodeListener({
      minLength: 3,
      idleMs: 1000,
      continueWindowMs: 1000,
      scanSpeedMs: 50,
      onScan(code) {
        // Clear any digits that leaked into the search box before scan was confirmed
        setQuery("");
        const match = findByBarcode(productsRef.current, code);
        if (match) {
          addProductRef.current(match, 1);
        } else {
          setError(`No product for barcode ${code}`);
        }
        queueMicrotask(() => searchRef.current?.focus());
      },
      onManualDigit(digit) {
        const el = searchRef.current;
        if (!el) return false;
        el.focus();
        setQuery((prev) => {
          const trimmed = prev.trim();
          if (!trimmed || /^\d+$/.test(trimmed)) return trimmed + digit;
          return digit;
        });
        return true;
      },
      isOwnedInput(el) {
        return el === searchRef.current;
      },
      isProtectedInput(el) {
        if (el === searchRef.current) return false;
        if (!isEditableTarget(el)) return false;
        // Cart qty / selects — don't steal digits
        return true;
      },
    });
  }, []);

  return (
    <div className="pos-grid">
      <div className="stack" style={{ gap: "0.85rem" }}>
        <div className="surface" style={{ padding: ".8rem 1rem" }}>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="button" onClick={newTicket}>New ticket</button>
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                className={`btn ${activeTicketId === ticket.id ? "btn-primary" : "btn-soft"}`}
                type="button"
                onClick={() => switchTicket(ticket)}
              >
                {ticket.ticket_number} ({ticket.lines.length})
              </button>
            ))}
          </div>
        </div>
        <div className="surface" style={{ padding: "1rem 1.15rem" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>{labels.search}</label>
            <input
              ref={searchRef}
              className="input"
              value={query}
              placeholder={labels.searchHint}
              autoFocus
              data-pos-search
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  tryExactAdd();
                }
              }}
            />
          </div>
        </div>

        {categories.length ? (
          <div className="row" style={{ flexWrap: "wrap", gap: ".4rem" }}>
            <button type="button" className={`btn ${!categoryId ? "btn-primary" : "btn-soft"}`} onClick={() => setCategoryId("")}>All</button>
            {categories.map((category) => (
              <button key={category.id} type="button" className={`btn ${categoryId === category.id ? "btn-primary" : "btn-soft"}`} onClick={() => setCategoryId(category.id)}>{category.name}</button>
            ))}
          </div>
        ) : null}

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
                    {p.price_on_sale ? "Price at sale" : formatCurrency(Number(p.unit_price))} · {p.track_stock ? `${labels.stock} ${p.quantity}` : "Stock not tracked"}
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
                    <td>{p.track_stock ? p.quantity : "∞"}</td>
                    <td>{p.price_on_sale ? "At sale" : formatCurrency(Number(p.unit_price))}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn btn-soft"
                        style={{ padding: "0.35rem 0.7rem" }}
                        disabled={p.track_stock && p.quantity <= 0}
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
        <button
          type="button"
          className="btn btn-soft"
          style={{ width: "100%", marginTop: ".5rem" }}
          disabled={pending || !cart.length}
          onClick={holdTicket}
        >
          Hold ticket
        </button>
        {activeTicketId ? (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: ".5rem" }}
            disabled={pending}
            onClick={() => {
              if (demoMode) {
                setTickets((current) => current.filter((t) => t.id !== activeTicketId));
                newTicket();
                return;
              }
              const fd = new FormData();
              fd.set("ticket_id", activeTicketId);
              startTransition(async () => {
                const result = await voidPosTicketAction(fd);
                if (result && "error" in result && result.error) return setError(result.error);
                setTickets((current) => current.filter((ticket) => ticket.id !== activeTicketId));
                newTicket();
                router.refresh();
              });
            }}
          >
            Void held ticket
          </button>
        ) : null}
        {lastInvoiceId ? (
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: ".5rem" }}
            onClick={() => {
              if (demoMode) {
                setOkMsg(labels.success);
                setLastInvoiceId("");
                return;
              }
              router.push(`/invoices?preview=${lastInvoiceId}`);
            }}
          >
            Print receipt
          </button>
        ) : null}
      </div>
    </div>
  );
}
