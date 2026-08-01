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
    customers?: { name: string; risk_level?: "high" | "medium" | "low" | null } | null;
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
                <PatientName name={a.customers.name} risk={a.customers.risk_level} />
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
