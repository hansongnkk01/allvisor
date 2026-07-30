"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export type ChartGrain = "hour" | "day" | "week" | "month";

type LedgerRow = {
  id: string;
  entry_type: string;
  amount: number | string;
  entry_date: string;
  created_at: string;
  description?: string | null;
};

function bucketKey(isoDate: string, createdAt: string, grain: ChartGrain) {
  const d = new Date(grain === "hour" ? createdAt : `${isoDate}T12:00:00+08:00`);
  if (Number.isNaN(d.getTime())) return "unknown";
  if (grain === "hour") {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    return `${y}-${m}-${day} ${h}:00`;
  }
  if (grain === "day") return isoDate;
  if (grain === "week") {
    const tmp = new Date(d);
    const day = (tmp.getDay() + 6) % 7;
    tmp.setDate(tmp.getDate() - day);
    return tmp.toISOString().slice(0, 10);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function AccountingCashChart({
  ledger,
  labels,
}: {
  ledger: LedgerRow[];
  labels: {
    title: string;
    byHour: string;
    byDay: string;
    byWeek: string;
    byMonth: string;
    income: string;
    expense: string;
    empty: string;
  };
}) {
  const [grain, setGrain] = useState<ChartGrain>("day");

  const series = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const row of ledger) {
      const key = bucketKey(row.entry_date, row.created_at, grain);
      const cur = map.get(key) || { income: 0, expense: 0 };
      const amt = Number(row.amount) || 0;
      if (row.entry_type === "income") cur.income += amt;
      else cur.expense += amt;
      map.set(key, cur);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, v]) => ({ label, ...v, net: v.income - v.expense }));
  }, [ledger, grain]);

  const maxVal = Math.max(1, ...series.map((s) => Math.max(s.income, s.expense, Math.abs(s.net))));
  const w = 720;
  const h = 220;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  function xAt(i: number) {
    if (series.length <= 1) return padL + innerW / 2;
    return padL + (i / (series.length - 1)) * innerW;
  }
  function yAt(v: number) {
    return padT + innerH - (v / maxVal) * innerH;
  }

  function pathFor(getter: (s: (typeof series)[number]) => number) {
    if (!series.length) return "";
    return series
      .map((s, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(getter(s)).toFixed(1)}`)
      .join(" ");
  }

  const grains: Array<{ id: ChartGrain; label: string }> = [
    { id: "hour", label: labels.byHour },
    { id: "day", label: labels.byDay },
    { id: "week", label: labels.byWeek },
    { id: "month", label: labels.byMonth },
  ];

  return (
    <div className="surface" style={{ padding: "1.15rem 1.25rem" }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0 }}>{labels.title}</h3>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {grains.map((g) => (
            <button
              key={g.id}
              type="button"
              className={grain === g.id ? "btn btn-primary" : "btn btn-ghost"}
              style={{ padding: "0.35rem 0.7rem", fontSize: "0.8rem" }}
              onClick={() => setGrain(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {!series.length ? (
        <p className="muted" style={{ marginTop: 16 }}>
          {labels.empty}
        </p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ minWidth: 560, maxWidth: 900 }}>
            {[0, 0.5, 1].map((t) => {
              const y = yAt(maxVal * t);
              return (
                <g key={t}>
                  <line
                    x1={padL}
                    x2={w - padR}
                    y1={y}
                    y2={y}
                    stroke="rgba(28,27,25,0.08)"
                    strokeWidth={1}
                  />
                  <text
                    x={padL - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={10}
                    fill="var(--muted)"
                  >
                    {Math.round(maxVal * t)}
                  </text>
                </g>
              );
            })}
            <path
              d={pathFor((s) => s.income)}
              fill="none"
              stroke="#0f766e"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d={pathFor((s) => s.expense)}
              fill="none"
              stroke="#b45309"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {series.map((s, i) => (
              <g key={s.label}>
                <circle cx={xAt(i)} cy={yAt(s.income)} r={3.5} fill="#0f766e" />
                <circle cx={xAt(i)} cy={yAt(s.expense)} r={3.5} fill="#b45309" />
                <text
                  x={xAt(i)}
                  y={h - 12}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--muted)"
                >
                  {s.label.length > 10 ? s.label.slice(5) : s.label}
                </text>
              </g>
            ))}
          </svg>
          <div className="row" style={{ gap: 14, marginTop: 4, fontSize: "0.8rem" }}>
            <span className="row" style={{ gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#0f766e" }} />
              {labels.income}
            </span>
            <span className="row" style={{ gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#b45309" }} />
              {labels.expense}
            </span>
            <span className="muted">
              Peak: {formatCurrency(maxVal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
