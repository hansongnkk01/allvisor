"use client";

import { useState } from "react";

export function BranchGroup({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="surface" style={{ padding: "1rem 1.15rem" }}>
      <button
        type="button"
        className="row"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          justifyContent: "space-between",
          background: "transparent",
          border: 0,
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
        }}
      >
        <strong style={{ fontSize: "1.05rem" }}>{title}</strong>
        <span className="badge">{open ? "−" : "+"}</span>
      </button>
      {open ? <div style={{ marginTop: "1rem" }}>{children}</div> : null}
    </div>
  );
}
