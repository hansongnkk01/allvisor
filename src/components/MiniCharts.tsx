"use client";

import { formatCurrency } from "@/lib/utils";

export type ChartPoint = { key: string; label: string; value: number };
export type HBarRow = { label: string; value: number; hint?: string };

/**
 * Lightweight div-based charts (no chart library) so the Performance and Money
 * pages can show several graphs without new dependencies.
 */

export function VBarChart({
  points,
  empty,
  height = 150,
  color = "var(--accent)",
}: {
  points: ChartPoint[];
  empty: string;
  height?: number;
  color?: string;
}) {
  const peak = Math.max(0, ...points.map((p) => p.value));
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
          key={point.key}
          title={`${point.label}: ${formatCurrency(point.value)}`}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            height: "100%",
            minWidth: 0,
          }}
        >
          <div
            style={{
              height: `${Math.round((point.value / peak) * 100)}%`,
              minHeight: 2,
              background: color,
              borderRadius: 4,
            }}
          />
          <div
            className="muted"
            style={{
              fontSize: "0.65rem",
              textAlign: "center",
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {point.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Two series side-by-side per bucket (e.g. income vs expense). */
export function GroupedBarChart({
  points,
  empty,
  height = 160,
  colorA = "var(--accent)",
  colorB = "var(--danger, #dc2626)",
  legendA,
  legendB,
}: {
  points: { key: string; label: string; a: number; b: number }[];
  empty: string;
  height?: number;
  colorA?: string;
  colorB?: string;
  legendA: string;
  legendB: string;
}) {
  const peak = Math.max(0, ...points.flatMap((p) => [p.a, p.b]));
  if (!points.length || peak <= 0) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        {empty}
      </p>
    );
  }
  return (
    <div>
      <div className="row" style={{ gap: "1rem", marginBottom: "0.5rem" }}>
        <span className="muted" style={{ fontSize: "0.78rem" }}>
          <span style={{ display: "inline-block", width: 10, height: 10, background: colorA, borderRadius: 2, marginRight: 4 }} />
          {legendA}
        </span>
        <span className="muted" style={{ fontSize: "0.78rem" }}>
          <span style={{ display: "inline-block", width: 10, height: 10, background: colorB, borderRadius: 2, marginRight: 4 }} />
          {legendB}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.35rem", height }}>
        {points.map((point) => (
          <div
            key={point.key}
            title={`${point.label}: ${legendA} ${formatCurrency(point.a)} · ${legendB} ${formatCurrency(point.b)}`}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-end",
              gap: 2,
              height: "100%",
              minWidth: 0,
            }}
          >
            <div
              style={{
                flex: 1,
                height: `${Math.round((point.a / peak) * 100)}%`,
                minHeight: 2,
                background: colorA,
                borderRadius: 3,
              }}
            />
            <div
              style={{
                flex: 1,
                height: `${Math.round((point.b / peak) * 100)}%`,
                minHeight: 2,
                background: colorB,
                borderRadius: 3,
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.35rem" }}>
        {points.map((point) => (
          <div
            key={point.key}
            className="muted"
            style={{
              flex: 1,
              fontSize: "0.65rem",
              textAlign: "center",
              marginTop: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Net values that can go below zero (e.g. profit per day). */
export function DivergingBarChart({
  points,
  empty,
  height = 150,
}: {
  points: ChartPoint[];
  empty: string;
  height?: number;
}) {
  const maxAbs = Math.max(0, ...points.map((p) => Math.abs(p.value)));
  if (!points.length || maxAbs <= 0) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        {empty}
      </p>
    );
  }
  const half = Math.floor(height / 2);
  return (
    <div style={{ display: "flex", gap: "0.35rem", height }}>
      {points.map((point) => {
        const pct = Math.round((Math.abs(point.value) / maxAbs) * 100);
        const positive = point.value >= 0;
        return (
          <div
            key={point.key}
            title={`${point.label}: ${formatCurrency(point.value)}`}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <div style={{ height: half, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              {positive ? (
                <div
                  style={{
                    height: `${pct}%`,
                    minHeight: 2,
                    background: "var(--accent)",
                    borderRadius: "4px 4px 0 0",
                  }}
                />
              ) : null}
            </div>
            <div style={{ height: half, display: "flex", flexDirection: "column", borderTop: "1px solid var(--border, #e5e7eb)" }}>
              {!positive ? (
                <div
                  style={{
                    height: `${pct}%`,
                    minHeight: 2,
                    background: "var(--danger, #dc2626)",
                    borderRadius: "0 0 4px 4px",
                  }}
                />
              ) : null}
            </div>
            <div
              className="muted"
              style={{
                fontSize: "0.65rem",
                textAlign: "center",
                marginTop: 4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {point.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal comparison bars (e.g. staff ranking, category breakdown). */
export function HBarChart({
  rows,
  empty,
  color = "var(--accent)",
}: {
  rows: HBarRow[];
  empty: string;
  color?: string;
}) {
  const peak = Math.max(0, ...rows.map((r) => r.value));
  if (!rows.length || peak <= 0) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        {empty}
      </p>
    );
  }
  return (
    <div className="stack" style={{ gap: "0.5rem" }}>
      {rows.map((row) => (
        <div key={row.label} style={{ display: "grid", gridTemplateColumns: "minmax(90px, 160px) 1fr auto", gap: "0.6rem", alignItems: "center" }}>
          <span
            style={{
              fontSize: "0.85rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={row.hint || row.label}
          >
            {row.label}
          </span>
          <div style={{ background: "var(--surface-soft, rgba(0,0,0,0.05))", borderRadius: 4, height: 14, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(2, Math.round((row.value / peak) * 100))}%`,
                height: "100%",
                background: color,
                borderRadius: 4,
              }}
            />
          </div>
          <span style={{ fontSize: "0.85rem", fontVariantNumeric: "tabular-nums" }}>
            {formatCurrency(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
