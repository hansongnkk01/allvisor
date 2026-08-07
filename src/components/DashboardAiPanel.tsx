"use client";

import { useEffect, useState } from "react";
import { getNicheVocab } from "@/lib/niche-vocab";
import { hasCapability } from "@/lib/niches";

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
  const vocab = getNicheVocab(data.niche);
  const V = vocab.labels.en;
  const people = V.entityPlural;
  const hasPos = hasCapability(data.niche, "pos");
  const hasAppts = hasCapability(data.niche, "appointments");
  const hasInventory = hasCapability(data.niche, "inventory");

  if (hasInventory && data.lowStock > 0) {
    const names = (data.lowStockNames || []).filter(Boolean);
    const shown = names.slice(0, 4);
    const extra = names.length > shown.length ? ` (+${names.length - shown.length} more)` : "";
    const namePart = shown.length
      ? `Low stock: ${shown.join(", ")}${extra}.`
      : `${data.lowStock} item(s) are low in ${V.business} inventory.`;
    tips.push({
      tone: "alert",
      text: `${namePart} Restock before demand spikes.`,
    });
  }

  if (data.unpaidInvoices > 0) {
    tips.push({
      tone: "alert",
      text: `${data.unpaidInvoices} unpaid invoice(s). Follow up with ${people} today to improve cash collection.`,
    });
  }

  if (profit < 0) {
    tips.push({
      tone: "alert",
      text: `Cash flow is negative this period for your ${V.business}. Review expenses and collections.`,
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
      text: `${data.lhdnPending} paid invoice(s) are not confirmed on MyInvois yet. Check TIN / intermediary link on the LHDN page.`,
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
      text: `${V.entityTitle} base is still small. Grow your ${V.business} CRM and follow up regularly.`,
    });
  }

  if (hasPos && data.income === 0) {
    tips.push({
      tone: "info",
      text: `No sales recorded today yet. Open POS and log purchases so daily close stays accurate.`,
    });
  }

  if (hasAppts && data.appointmentsToday === 0) {
    tips.push({
      tone: "info",
      text: `No ${V.schedule.toLowerCase()} today. Fill empty slots on the ${V.schedule.toLowerCase()} board.`,
    });
  }

  if (vocab.niche === "tuition") {
    tips.push({
      tone: "info",
      text: "Check attendance and update student marks under Assessments.",
    });
  }

  if (!tips.length) {
    tips.push({
      tone: "good",
      text: `${V.businessTitle} operations look stable. Keep logging every payment for cleaner monthly reports.`,
    });
  }

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
  // Stays null through SSR: the server and the browser format clock time
  // differently, and rendering it on both sides breaks hydration.
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

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
        Tips from current dashboard
        {updatedAt
          ? ` · ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : null}
      </p>
    </aside>
  );
}
