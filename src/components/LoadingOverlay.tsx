"use client";

import { createPortal } from "react-dom";

export function LoadingOverlay({
  show,
  label = "Processing…",
}: {
  show: boolean;
  label?: string;
}) {
  if (!show || typeof document === "undefined") return null;
  return createPortal(
    <div className="loading-overlay" role="status" aria-live="polite">
      <div
        className="surface"
        style={{
          padding: "1.25rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          minWidth: 160,
        }}
      >
        <div className="loading-spinner" aria-hidden />
        <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{label}</div>
      </div>
    </div>,
    document.body
  );
}
