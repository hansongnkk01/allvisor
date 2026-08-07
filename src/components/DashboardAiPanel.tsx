"use client";

import { useEffect, useState, useTransition } from "react";
import { getNicheVocab } from "@/lib/niche-vocab";
import { hasCapability } from "@/lib/niches";
import { updateAlertStatusAction } from "@/app/ops-brain-actions";

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

export type DbAlertTip = {
  id: string;
  title: string;
  message: string;
  severity: "low" | "medium" | "high";
  status: string;
};

type TipTone = "good" | "alert" | "info";

type Tip = {
  text: string;
  tone: TipTone;
  alertId?: string;
  canResolve?: boolean;
};

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

function dbAlertsToTips(
  alerts: DbAlertTip[],
  opts: { includeHigh: boolean; canResolve: boolean }
): Tip[] {
  return alerts
    .filter((a) => opts.includeHigh || a.severity !== "high")
    .slice(0, 6)
    .map((a) => ({
      text: `${a.title}: ${a.message}`,
      tone: (a.severity === "low" ? "info" : "alert") as TipTone,
      alertId: a.id,
      canResolve: opts.canResolve && a.status !== "resolved",
    }));
}

export function DashboardAiPanel({
  data,
  title,
  dbAlerts = [],
  opsBrainEnabled = false,
  includeHighSeverity = true,
  canResolveAlerts = false,
}: {
  data: InsightInput;
  title: string;
  dbAlerts?: DbAlertTip[];
  opsBrainEnabled?: boolean;
  /** Staff dashboards pass false to hide high-severity alerts. */
  includeHighSeverity?: boolean;
  canResolveAlerts?: boolean;
}) {
  const ruleTips = buildInsights(data);
  const alertTips =
    opsBrainEnabled && dbAlerts.length
      ? dbAlertsToTips(dbAlerts, {
          includeHigh: includeHighSeverity,
          canResolve: canResolveAlerts,
        })
      : [];
  const [tips, setTips] = useState(() => [...alertTips, ...ruleTips].slice(0, 6));
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const nextAlertTips =
      opsBrainEnabled && dbAlerts.length
        ? dbAlertsToTips(dbAlerts, {
            includeHigh: includeHighSeverity,
            canResolve: canResolveAlerts,
          })
        : [];
    setTips([...nextAlertTips, ...buildInsights(data)].slice(0, 6));
    setUpdatedAt(new Date());
  }, [data, dbAlerts, opsBrainEnabled, includeHighSeverity, canResolveAlerts]);

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
        <span className="badge">{opsBrainEnabled ? "Ops Brain" : "AI"}</span>
      </div>
      <div className="stack" style={{ gap: "0.5rem" }}>
        {tips.map((tip, i) => {
          const color = TONE_STYLE[tip.tone];
          return (
            <div
              key={`${tip.tone}-${tip.alertId || tip.text}-${i}`}
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
              <p style={{ margin: 0 }}>{tip.text}</p>
              {tip.alertId && tip.canResolve ? (
                <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    disabled={pending}
                    onClick={() => {
                      const fd = new FormData();
                      fd.set("alert_id", tip.alertId!);
                      fd.set("status", "investigating");
                      startTransition(async () => {
                        await updateAlertStatusAction(fd);
                      });
                    }}
                  >
                    Investigating
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                    disabled={pending}
                    onClick={() => {
                      const fd = new FormData();
                      fd.set("alert_id", tip.alertId!);
                      fd.set("status", "resolved");
                      startTransition(async () => {
                        await updateAlertStatusAction(fd);
                      });
                    }}
                  >
                    Resolve
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: "0.75rem", marginTop: 10, marginBottom: 0 }}>
        {opsBrainEnabled ? "Live alerts + tips" : "Tips from current dashboard"} ·{" "}
        {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
    </aside>
  );
}
