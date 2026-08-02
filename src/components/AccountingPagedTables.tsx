"use client";

import { ListPager, useClientPager } from "@/components/ListControls";
import { CsvDownloadButton } from "@/components/CsvDownloadButton";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 10;

type LedgerRow = {
  id: string;
  entry_date: string;
  entry_type: string;
  description: string | null;
  source: string;
  amount: number | string;
  created_at: string;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number | string;
};

export function AccountingLedgerTable({
  title,
  exportLabel,
  filename,
  rows,
  empty,
  labels,
}: {
  title: string;
  exportLabel: string;
  filename: string;
  rows: LedgerRow[];
  empty: string;
  labels: {
    date: string;
    type: string;
    description: string;
    source: string;
    amount: string;
    recordedAt: string;
  };
}) {
  const pager = useClientPager(rows, PAGE_SIZE);

  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <CsvDownloadButton
          label={exportLabel}
          filename={filename}
          headers={[
            labels.date,
            labels.type,
            labels.description,
            labels.source,
            labels.amount,
            labels.recordedAt,
          ]}
          rows={rows.map((e) => [
            e.entry_date,
            e.entry_type,
            e.description || "",
            e.source,
            Number(e.amount),
            e.created_at,
          ])}
        />
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{labels.date}</th>
              <th>{labels.type}</th>
              <th>{labels.description}</th>
              <th>{labels.source}</th>
              <th>{labels.amount}</th>
              <th>{labels.recordedAt}</th>
            </tr>
          </thead>
          <tbody>
            {pager.slice.map((e) => (
              <tr key={e.id}>
                <td>{formatDate(e.entry_date)}</td>
                <td>
                  <span className="badge">{e.entry_type}</span>
                </td>
                <td>{e.description || "—"}</td>
                <td>{e.source}</td>
                <td
                  style={{
                    color: e.entry_type === "income" ? "var(--ok, #0a7)" : "inherit",
                    fontWeight: 600,
                  }}
                >
                  {e.entry_type === "income" ? "+" : "−"}
                  {formatCurrency(Number(e.amount))}
                </td>
                <td>{formatDateTime(e.created_at)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="muted">
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

export function AccountingExpenseTable({
  title,
  exportLabel,
  filename,
  rows,
  empty,
  labels,
}: {
  title: string;
  exportLabel: string;
  filename: string;
  rows: ExpenseRow[];
  empty: string;
  labels: {
    date: string;
    category: string;
    description: string;
    amount: string;
  };
}) {
  const pager = useClientPager(rows, PAGE_SIZE);

  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <CsvDownloadButton
          label={exportLabel}
          filename={filename}
          headers={[labels.date, labels.category, labels.description, labels.amount]}
          rows={rows.map((e) => [
            e.expense_date,
            e.category,
            e.description || "",
            Number(e.amount),
          ])}
        />
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{labels.date}</th>
              <th>{labels.category}</th>
              <th>{labels.description}</th>
              <th>{labels.amount}</th>
            </tr>
          </thead>
          <tbody>
            {pager.slice.map((e) => (
              <tr key={e.id}>
                <td>{formatDate(e.expense_date)}</td>
                <td>{e.category}</td>
                <td>{e.description || "—"}</td>
                <td>{formatCurrency(Number(e.amount))}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={4} className="muted">
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
