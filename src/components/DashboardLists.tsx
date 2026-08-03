"use client";

import { ListPager, useClientPager } from "@/components/ListControls";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PatientName } from "@/components/PatientName";

export function DashboardRecentInvoices({
  title,
  invoices,
}: {
  title: string;
  invoices: Array<{
    id: string;
    title: string | null;
    invoice_number: string;
    status: string;
    total: number;
    created_at: string;
  }>;
}) {
  const pager = useClientPager(invoices, 5);
  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>#</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {pager.slice.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <div>{inv.title || inv.invoice_number}</div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>
                    {formatDateTime(inv.created_at)}
                  </div>
                </td>
                <td>
                  <span className="badge">{inv.status}</span>
                </td>
                <td>{formatCurrency(Number(inv.total))}</td>
              </tr>
            ))}
            {!invoices.length ? (
              <tr>
                <td colSpan={3} className="muted">
                  —
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

export function DashboardUpcomingAppointments({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    starts_at: string;
    customers?: {
      name: string;
      risk_level?: "high" | "medium" | "low" | null;
      allergies?: string | null;
    } | null;
  }>;
}) {
  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="stack scroll-cap-7" style={{ gap: "0.75rem" }}>
        {items.map((a) => (
          <div key={a.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
            <strong>{a.title}</strong>
            <div className="muted" style={{ fontSize: "0.9rem" }}>
              {a.customers?.name ? (
                <PatientName
                  name={a.customers.name}
                  risk={a.customers.risk_level}
                  allergies={a.customers.allergies}
                />
              ) : (
                "—"
              )}{" "}
              · {formatDateTime(a.starts_at)}
            </div>
          </div>
        ))}
        {!items.length ? <p className="muted">—</p> : null}
      </div>
    </div>
  );
}

/** Retail: payments / invoices paid today */
export function DashboardTodaySales({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{
    id: string;
    label: string;
    customer?: string | null;
    amount: number;
    paid_at: string;
  }>;
}) {
  const pager = useClientPager(rows, 6);
  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Sale</th>
              <th>Customer</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {pager.slice.map((r) => (
              <tr key={r.id}>
                <td>
                  <div>{r.label}</div>
                  <div className="muted" style={{ fontSize: "0.8rem" }}>
                    {formatDateTime(r.paid_at)}
                  </div>
                </td>
                <td>{r.customer || "—"}</td>
                <td>{formatCurrency(r.amount)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={3} className="muted">
                  {empty}
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

/** Retail: top selling products from stock movements (sale) */
export function DashboardTopSellers({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{ name: string; units: number }>;
}) {
  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="stack" style={{ gap: "0.55rem" }}>
        {rows.map((r, i) => (
          <div
            key={`${r.name}-${i}`}
            className="row"
            style={{ justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}
          >
            <strong style={{ fontSize: "0.95rem" }}>
              {i + 1}. {r.name}
            </strong>
            <span className="muted">{r.units} sold</span>
          </div>
        ))}
        {!rows.length ? <p className="muted">{empty}</p> : null}
      </div>
    </div>
  );
}
