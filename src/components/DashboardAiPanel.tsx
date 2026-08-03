"use client";

import { useEffect, useState } from "react";

type InsightInput = {
  niche: string;
  patients: number;
  unpaidInvoices: number;
  lowStock: number;
  /** Product names at or below low-stock threshold */
  lowStockNames?: string[];
  income: number;
  expense: number;
  appointmentsToday: number;
  /** Paid invoices that still lack a successful MyInvois confirmation */
  lhdnPending: number;
  orgHasTin: boolean;
};

type TipTone = "good" | "alert" | "info";

type Tip = { text: string; tone: TipTone };

const TONE_STYLE: Record<TipTone, { bg: string; border: string }> = {
  good: { bg: "rgba(22, 163, 74, 0.1)", border: "rgba(22, 163, 74, 0.45)" },
  alert: { bg: "rgba(220, 38, 38, 0.1)", border: "rgba(220, 38, 38, 0.45)" },
  info: { bg: "rgba(37, 99, 235, 0.1)", border: "rgba(37, 99, 235, 0.4)" },
};

function buildInsights(data: InsightInput): Tip[] {
  const tips: Tip[] = [];
  const profit = data.income - data.expense;
  const isRetail = data.niche === "retail" || data.niche === "pharmacy" || data.niche === "fashion" || data.niche === "electronics" || data.niche === "wholesale" || data.niche === "laundry" || data.niche === "fnb";
  const people = isRetail ? "customers" : "patients";

  if (data.lowStock > 0) {
    const names = (data.lowStockNames || []).filter(Boolean);
    const shown = names.slice(0, 4);
    const extra = names.length > shown.length ? ` (+${names.length - shown.length} more)` : "";
    const namePart = shown.length
      ? `Low stock: ${shown.join(", ")}${extra}.`
      : isRetail
        ? `${data.lowStock} product(s) are low.`
        : `${data.lowStock} medicine/supply item(s) are low.`;
    tips.push({
      tone: "alert",
      text: `${namePart} Restock before weekend demand spikes.`,
    });
  }

  if (data.unpaidInvoices > 0) {
    tips.push({
      tone: "alert",
      text: `${data.unpaidInvoices} unpaid invoice(s). Call or WhatsApp ${people} today to improve cash collection.`,
    });
  }

  if (profit < 0) {
    tips.push({
      tone: "alert",
      text: isRetail
        ? "Cash flow is negative this period. Review expenses (rent, COGS) and push high-margin products."
        : "Cash flow is negative this period. Review expenses (rent, supplies) and raise high-demand service prices carefully.",
    });
  }

  if (!data.orgHasTin) {
    tips.push({
      tone: "alert",
      text: "Company TIN is missing. Set TIN in Admin / LHDN so auto e-Invoice on payment can work.",
    });
  } else if (data.lhdnPending > 0) {
    tips.push({
      tone: "alert",
      text: `${data.lhdnPending} paid invoice(s) are not confirmed on MyInvois yet. Auto-submit may have failed — check TIN / intermediary link on the LHDN page.`,
    });
  }

  if (profit > 0 && data.income > 0) {
    tips.push({
      tone: "good",
      text: `Cash flow is healthy (net RM ${profit.toFixed(2)}). Keep tracking daily collections vs expenses.`,
    });
  }

  if (data.patients < 5) {
    tips.push({
      tone: "info",
      text: isRetail
        ? "Customer base is still small. Run a simple promo and capture every walk-in into CRM."
        : "Patient base is still small. Push WhatsApp reminders and follow-ups after each visit to grow repeat patients.",
    });
  }

  if (isRetail && data.income === 0) {
    tips.push({
      tone: "info",
      text: "No sales recorded today yet. Open POS and log walk-in purchases so daily close stays accurate.",
    });
  }

  if (!isRetail && data.appointmentsToday === 0) {
    tips.push({
      tone: "info",
      text: "No appointments today. Fill empty slots with short-notice openings for walk-ins.",
    });
  }

  if (!tips.length) {
    tips.push({
      tone: "good",
      text: "Operations look stable. Keep logging every payment and stock movement for cleaner monthly reports.",
    });
  }

  // Prefer alerts first, then good, then info — max 4
  const order: TipTone[] = ["alert", "good", "info"];
  tips.sort((a, b) => order.indexOf(a.tone) - order.indexOf(b.tone));
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
          const color = TONE_STYLE[tip.tone];
          return (
            <p
              key={`${tip.tone}-${tip.text}-${i}`}
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
              {tip.text}
            </p>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: "0.75rem", marginTop: 10, marginBottom: 0 }}>
        Tips from current dashboard ·{" "}
        {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
    </aside>
  );
}
