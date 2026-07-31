"use client";

import { ListPager, useClientPager } from "@/components/ListControls";
import { RefreshLhdnStatusButton } from "@/components/RefreshLhdnStatusButton";

export function LhdnSubmissionsTable({
  rows,
  empty,
  refreshLabel,
  columns,
}: {
  rows: Array<{
    id: string;
    invoiceLabel: string;
    statusLabel: string;
    uuid: string | null;
    submittedAt: string;
    detail: string;
    invoiceId: string | null;
    canRefresh: boolean;
  }>;
  empty: string;
  refreshLabel: string;
  columns: {
    invoice: string;
    status: string;
    uuid: string;
    submitted: string;
    detail: string;
  };
}) {
  const pager = useClientPager(rows, 10);

  return (
    <div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{columns.invoice}</th>
              <th>{columns.status}</th>
              <th>{columns.uuid}</th>
              <th>{columns.submitted}</th>
              <th>{columns.detail}</th>
            </tr>
          </thead>
          <tbody>
            {pager.slice.map((s) => (
              <tr key={s.id}>
                <td>{s.invoiceLabel}</td>
                <td>
                  <span className="badge">{s.statusLabel}</span>
                  {s.canRefresh && s.invoiceId ? (
                    <RefreshLhdnStatusButton
                      invoiceId={s.invoiceId}
                      label={refreshLabel}
                    />
                  ) : null}
                </td>
                <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                  {s.uuid || "—"}
                </td>
                <td>{s.submittedAt}</td>
                <td style={{ fontSize: "0.8rem", maxWidth: 280, wordBreak: "break-word" }}>
                  {s.detail}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5} className="muted">
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
