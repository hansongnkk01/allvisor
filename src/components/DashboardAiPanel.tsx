"use client";

import { useEffect, useState } from "react";

type InsightInput = {
  niche: "clinic" | "retail";
  patients: number;
  unpaidInvoices: number;
  lowStock: number;
  income: number;
  expense: number;
  appointmentsToday: number;
  lhdnPending: number;
  orgHasTin: boolean;
};

const TIP_COLORS = [
  { bg: "rgba(15, 118, 110, 0.08)", border: "rgba(15, 118, 110, 0.28)" },
  { bg: "rgba(180, 83, 9, 0.08)", border: "rgba(180, 83, 9, 0.28)" },
  { bg: "rgba(37, 99, 235, 0.08)", border: "rgba(37, 99, 235, 0.25)" },
  { bg: "rgba(124, 58, 237, 0.08)", border: "rgba(124, 58, 237, 0.25)" },
];

function buildInsights(data: InsightInput) {
  const tips: string[] = [];
  const profit = data.income - data.expense;

  if (data.patients < 5) {
    tips.push(
      data.niche === "clinic"
        ? "Patient base is still small. Push WhatsApp reminders and follow-ups after each visit to grow repeat patients."
        : "Customer base is still small. Run a simple promo and capture every walk-in into CRM."
    );
  }

  if (data.unpaidInvoices > 0) {
    tips.push(
      `${data.unpaidInvoices} unpaid invoice(s). Call or WhatsApp patients today to improve cash collection.`
    );
  }

  if (data.lowStock > 0) {
    tips.push(
      `${data.lowStock} medicine/supply item(s) are low. Restock before weekend demand spikes.`
    );
  }

  if (profit < 0) {
    tips.push(
      "Cash flow is negative this period. Review expenses (rent, supplies) and raise high-demand service prices carefully."
    );
  } else if (profit > 0 && data.income > 0) {
    tips.push(
      `Cash flow is healthy (net RM ${profit.toFixed(2)}). Keep tracking daily collections vs expenses.`
    );
  }

  if (!data.orgHasTin || data.lhdnPending > 0) {
    tips.push(
      data.orgHasTin
        ? `${data.lhdnPending} invoice(s) still need LHDN submission. Submit before month-end.`
        : "Company TIN is missing. Set TIN in Settings/LHDN so e-Invoice submission can work."
    );
  }

  if (data.niche === "clinic" && data.appointmentsToday === 0) {
    tips.push(
      "No appointments today. Fill empty slots with short-notice openings for walk-ins."
    );
  }

  if (!tips.length) {
    tips.push(
      "Operations look stable. Keep logging every payment and stock movement for cleaner monthly reports."
    );
  }

  return tips.slice(0, 4);
}

export function DashboardAiPanel({
  data,
  title,
}: {
  data: InsightInput;
  title: string;
}) {
  const [tips, setTips] = useState(() => buildInsights(data));
  const [updatedAt, setUpdatedAt] = useState(() => new Date());

  useEffect(() => {
    setTips(buildInsights(data));
    setUpdatedAt(new Date());
  }, [data]);

  return (
    <aside
      className="surface"
      style={{
        padding: "1rem 1.1rem",
        minWidth: 0,
        flex: "1 1 280px",
        alignSelf: "stretch",
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <strong>{title}</strong>
        <span className="badge">AI</span>
      </div>
      <div className="stack" style={{ gap: "0.5rem" }}>
        {tips.map((tip, i) => {
          const color = TIP_COLORS[i % TIP_COLORS.length];
          return (
            <p
              key={`${tip}-${i}`}
              style={{
                margin: 0,
                fontSize: "0.86rem",
                lineHeight: 1.45,
                padding: "0.55rem 0.65rem",
                borderRadius: 10,
                background: color.bg,
                borderLeft: `3px solid ${color.border}`,
              }}
            >
              {tip}
            </p>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: "0.75rem", marginTop: 10, marginBottom: 0 }}>
        Tips from current dashboard · {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
    </aside>
  );
}
