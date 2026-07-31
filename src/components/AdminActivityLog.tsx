"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ListPager, SearchField, useClientPager } from "@/components/ListControls";
import { formatDateTime } from "@/lib/utils";

export function AdminActivityLog({
  title,
  hint,
  logs,
}: {
  title: string;
  hint: string;
  logs: Array<{
    id: string;
    actor_name: string | null;
    summary: string;
    created_at: string;
  }>;
}) {
  const pager = useClientPager(logs, 5);
  return (
    <div className="surface history-zone" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p className="muted">{hint}</p>
      <div className="stack" style={{ gap: "0.55rem" }}>
        {pager.slice.map((a) => (
          <div
            key={a.id}
            style={{ borderBottom: "1px solid var(--line)", paddingBottom: 6 }}
          >
            <strong>{a.actor_name || "Staff"}</strong>
            <span className="muted"> · {a.summary}</span>
            <div className="muted" style={{ fontSize: "0.8rem" }}>
              {formatDateTime(a.created_at)}
            </div>
          </div>
        ))}
        {!logs.length ? <p className="muted">—</p> : null}
      </div>
      <ListPager page={pager.page} totalPages={pager.totalPages} onPage={pager.setPage} />
    </div>
  );
}

export function AdminSearchRows({
  items,
  searchPlaceholder,
  empty,
  renderRow,
}: {
  items: Array<{ id: string; search: string }>;
  searchPlaceholder: string;
  empty: string;
  renderRow: (id: string) => ReactNode;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) => i.search.toLowerCase().includes(needle));
  }, [items, q]);

  return (
    <div>
      <SearchField value={q} onChange={setQ} placeholder={searchPlaceholder} />
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table className="data">
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id}>{renderRow(i.id)}</tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td className="muted">{empty}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
