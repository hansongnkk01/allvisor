"use client";

import { useMemo, useState } from "react";
import { CustomerRow } from "@/components/CustomerRow";
import { ListPager, SearchField, useClientPager } from "@/components/ListControls";
import type { TimelineLabels } from "@/components/PatientTimelinePanel";
import type { Customer } from "@/lib/types";

export function PatientsList({
  customers,
  labels,
  empty,
  searchPlaceholder,
}: {
  customers: Customer[];
  labels: {
    name: string;
    email: string;
    phone: string;
    ic: string;
    address: string;
    notes: string;
    save: string;
    delete: string;
    edit: string;
    cancel: string;
    addedBy: string;
    risk: string;
    allergies: string;
    timeline: TimelineLabels;
  };
  empty: string;
  searchPlaceholder: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c) =>
      [c.name, c.email, c.phone, c.ic_number, c.address, c.notes, c.allergies]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [customers, q]);
  const pager = useClientPager(filtered, 10);

  return (
    <div>
      <SearchField
        value={q}
        onChange={(v) => {
          setQ(v);
          pager.setPage(1);
        }}
        placeholder={searchPlaceholder}
      />
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{labels.name}</th>
              <th>{labels.risk}</th>
              <th>{labels.ic}</th>
              <th>{labels.address}</th>
              <th>{labels.phone}</th>
              <th>{labels.email}</th>
              <th>{labels.addedBy}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pager.slice.map((c) => (
              <CustomerRow key={c.id} customer={c} labels={labels} />
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={8} className="muted">
                  {empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <ListPager
        page={pager.page}
        totalPages={pager.totalPages}
        onPage={pager.setPage}
      />
    </div>
  );
}
