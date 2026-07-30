"use client";

import { useMemo, useRef, useState } from "react";

export type SearchOption = { value: string; label: string };

/** Type-to-search select with scrollable list capped to ~10 visible rows. */
export function SearchableSelect({
  name,
  options,
  value,
  onChange,
  placeholder = "—",
  required,
  disabled,
}: {
  name: string;
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input type="hidden" name={name} value={value} required={required} />
      <input
        className="input"
        disabled={disabled}
        placeholder={selected?.label || placeholder}
        value={open ? query : selected?.label || ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange("");
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onBlur={() => {
          // delay so option click registers
          window.setTimeout(() => setOpen(false), 150);
        }}
        autoComplete="off"
      />
      {open ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 40,
            background: "#fff",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "0 10px 28px rgba(28,27,25,0.14)",
            maxHeight: "calc(10 * 2.05rem)",
            overflowY: "auto",
          }}
        >
          {filtered.length === 0 ? (
            <div className="muted" style={{ padding: "0.55rem 0.75rem", fontSize: "0.85rem" }}>
              No matches
            </div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.value);
                  setQuery("");
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.45rem 0.75rem",
                  border: "none",
                  background: o.value === value ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
