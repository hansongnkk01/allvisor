"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SearchField } from "@/components/ListControls";

export function AdminSearchableBlock({
  searchPlaceholder,
  searchText: _searchText,
  children,
}: {
  searchPlaceholder: string;
  searchText: string;
  children: (q: string) => ReactNode;
}) {
  const [q, setQ] = useState("");
  return (
    <div>
      <SearchField value={q} onChange={setQ} placeholder={searchPlaceholder} />
      {children(q.trim().toLowerCase())}
    </div>
  );
}

export function filterByQuery<T>(
  items: T[],
  q: string,
  text: (item: T) => string
) {
  if (!q) return items;
  return items.filter((item) => text(item).toLowerCase().includes(q));
}

export function useFilteredList<T>(items: T[], text: (item: T) => string) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => text(item).toLowerCase().includes(needle));
  }, [items, q, text]);
  return { q, setQ, filtered };
}
