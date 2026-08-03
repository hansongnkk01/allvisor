"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

export function useClientPager<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const slice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePage]);

  return {
    page: safePage,
    setPage,
    totalPages,
    slice,
    total: items.length,
  };
}

export function ListPager({
  page,
  totalPages,
  onPage,
  labels,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  labels?: { prev?: string; next?: string };
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="pager">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {labels?.prev || "‹"}
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`btn btn-ghost${p === page ? " is-active" : ""}`}
          onClick={() => onPage(p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="btn btn-ghost"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {labels?.next || "›"}
      </button>
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  inputRef,
  "data-inventory-search": dataInventorySearch,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  inputRef?: (el: HTMLInputElement | null) => void;
  "data-inventory-search"?: boolean;
}) {
  return (
    <input
      ref={inputRef}
      className="input"
      type="search"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ maxWidth: 360, marginBottom: "0.75rem" }}
      data-inventory-search={dataInventorySearch ? "" : undefined}
    />
  );
}

export function HistoryZone({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`surface history-zone ${className}`.trim()} style={{ padding: "1.25rem", ...style }}>
      {children}
    </div>
  );
}
