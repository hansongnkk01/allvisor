"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ListPager, SearchField, useClientPager } from "@/components/ListControls";
import { formatDateTime } from "@/lib/utils";

type Log = {
  id: string;
  actor_name: string | null;
  summary: string;
  action: string;
  created_at: string;
};

export function SectionActivityLog({
  title,
  logs,
  empty = "No activity yet.",
  pageSize = 5,
}: {
  title: string;
  logs: Log[];
  empty?: string;
  pageSize?: number;
}) {
  const pager = useClientPager(logs, pageSize);

  return (
    <div className="surface history-zone" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="stack" style={{ gap: "0.55rem" }}>
        {pager.slice.map((a) => (
          <div
            key={a.id}
            style={{ borderBottom: "1px solid var(--line)", paddingBottom: 6 }}
          >
            <div>
              <strong>{a.actor_name || "Staff"}</strong>
              <span className="muted"> · {a.summary}</span>
            </div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>
              {formatDateTime(a.created_at)} · {a.action}
            </div>
          </div>
        ))}
        {!logs.length ? <p className="muted">{empty}</p> : null}
      </div>
      <ListPager page={pager.page} totalPages={pager.totalPages} onPage={pager.setPage} />
    </div>
  );
}

/** Client table wrapper: search + page size for arbitrary row render. */
export function SearchablePagedList<T>({
  items,
  pageSize,
  searchPlaceholder,
  searchText,
  render,
  empty,
}: {
  items: T[];
  pageSize: number;
  searchPlaceholder: string;
  searchText: (item: T) => string;
  render: (pageItems: T[]) => React.ReactNode;
  empty?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => searchText(item).toLowerCase().includes(needle));
  }, [items, q, searchText]);
  const pager = useClientPager(filtered, pageSize);

  return (
    <div>
      <SearchField value={q} onChange={(v) => { setQ(v); pager.setPage(1); }} placeholder={searchPlaceholder} />
      {filtered.length ? render(pager.slice) : empty}
      <ListPager
        page={pager.page}
        totalPages={pager.totalPages}
        onPage={pager.setPage}
      />
    </div>
  );
}
