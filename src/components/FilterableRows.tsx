"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SearchField } from "@/components/ListControls";

/** Client filter for server-rendered <tr data-search="..."> rows. */
export function FilterableRows({
  placeholder,
  children,
}: {
  placeholder: string;
  children: ReactNode;
}) {
  const [q, setQ] = useState("");
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    const needle = q.trim().toLowerCase();
    const rows = bodyRef.current?.querySelectorAll<HTMLTableRowElement>("tr[data-search]");
    rows?.forEach((tr) => {
      const hay = tr.getAttribute("data-search") || "";
      tr.style.display = !needle || hay.includes(needle) ? "" : "none";
    });
  }, [q]);

  return (
    <div>
      <SearchField value={q} onChange={setQ} placeholder={placeholder} />
      <div className="table-wrap" style={{ marginTop: 8 }}>
        <table className="data">
          <tbody ref={bodyRef}>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
