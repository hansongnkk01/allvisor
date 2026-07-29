"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

export function ExpandSection({
  title,
  defaultOpen = false,
  children,
  style,
  tone,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  style?: CSSProperties;
  tone?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="surface"
      style={{
        padding: "0.85rem 1rem",
        boxShadow: "none",
        background: tone || "rgba(255,255,255,0.7)",
        ...style,
      }}
    >
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
        <strong>{title}</strong>
        <span className="badge">{open ? "minimize" : "expand"}</span>
      </button>
      {open ? <div style={{ marginTop: "0.85rem" }}>{children}</div> : null}
    </div>
  );
}

const BRANCH_TONES = [
  "rgba(15, 118, 110, 0.08)",
  "rgba(37, 99, 235, 0.08)",
  "rgba(180, 83, 9, 0.1)",
  "rgba(124, 58, 237, 0.08)",
  "rgba(190, 24, 93, 0.08)",
  "rgba(22, 163, 74, 0.1)",
];

export function branchTone(index: number) {
  return BRANCH_TONES[index % BRANCH_TONES.length];
}

export function BranchGroup({
  title,
  defaultOpen = false,
  children,
  toneIndex = 0,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  toneIndex?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tone = branchTone(toneIndex);
  return (
    <div
      className="surface"
      style={{
        padding: "1rem 1.15rem",
        background: tone,
        borderColor: "transparent",
      }}
    >
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
        <span className="badge">{open ? "minimize" : "expand"}</span>
      </button>
      {open ? <div style={{ marginTop: "1rem" }}>{children}</div> : null}
    </div>
  );
}
