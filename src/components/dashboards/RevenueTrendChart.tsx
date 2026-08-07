"use client";

import { formatCurrency } from "@/lib/utils";
import type { RevenueTrendPoint } from "@/lib/dashboard-data";

/** Shared by the owner dashboard card and the Performance page so both read the same. */
export function RevenueTrendChart({
  points,
  empty,
  height = 160,
}: {
  points: RevenueTrendPoint[];
  empty: string;
  height?: number;
}) {
  const peak = Math.max(0, ...points.map((point) => point.amount));

  if (!points.length || peak <= 0) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        {empty}
      </p>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.35rem", height }}>
      {points.map((point) => (
        <div
          key={point.day}
          title={`${point.day}: ${formatCurrency(point.amount)}`}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            height: "100%",
          }}
        >
          <div
            style={{
              height: `${Math.round((point.amount / peak) * 100)}%`,
              minHeight: 2,
              background: "var(--accent)",
              borderRadius: 4,
            }}
          />
          <div
            className="muted"
            style={{ fontSize: "0.65rem", textAlign: "center", marginTop: 4 }}
          >
            {point.day.slice(8)}
          </div>
        </div>
      ))}
    </div>
  );
}
