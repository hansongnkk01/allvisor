import { Link } from "@/i18n/navigation";
import { formatCurrency } from "@/lib/utils";

export type DailyCloseRiskItem = {
  label: string;
  value: string;
  href?: string;
  tone?: "good" | "warn" | "alert";
};

export function DailyClosePanel({
  title,
  subtitle,
  incomeToday,
  unpaidCount,
  unpaidTotal,
  noShowToday,
  txnToday,
  lowStockNames,
  lhdnPendingCount,
  lhdnRejectedCount,
  /** Keep max 3–5 floor money/risk items — not a 15-step exam. */
  floorRiskItems = [],
  labels,
}: {
  title: string;
  subtitle: string;
  incomeToday: number;
  unpaidCount: number;
  unpaidTotal: number;
  /** Clinic no-shows; pass -1 to hide. */
  noShowToday: number;
  /** Retail txn count; pass -1 to hide. */
  txnToday?: number;
  lowStockNames: string[];
  lhdnPendingCount: number;
  lhdnRejectedCount: number;
  floorRiskItems?: DailyCloseRiskItem[];
  labels: {
    income: string;
    unpaid: string;
    noShow: string;
    txnToday?: string;
    lowStock: string;
    lhdnPending: string;
    lhdnRejected: string;
    none: string;
    openInvoices: string;
    openInventory: string;
    openLhdn: string;
    openPos?: string;
  };
}) {
  const stockPreview = lowStockNames.slice(0, 4);
  const stockExtra = lowStockNames.length - stockPreview.length;
  const showTxn = typeof txnToday === "number" && txnToday >= 0;

  return (
    <div
      className="surface"
      style={{
        padding: "1.15rem 1.25rem",
        borderColor: "rgba(15, 118, 110, 0.35)",
        background:
          "linear-gradient(135deg, rgba(15,118,110,0.06), rgba(255,255,255,0.9))",
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
            {subtitle}
          </p>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.65rem",
        }}
      >
        <CloseStat label={labels.income} value={formatCurrency(incomeToday)} tone="good" />
        <CloseStat
          label={labels.unpaid}
          value={`${unpaidCount} · ${formatCurrency(unpaidTotal)}`}
          tone={unpaidCount > 0 ? "alert" : "good"}
        />
        {noShowToday >= 0 ? (
          <CloseStat
            label={labels.noShow}
            value={String(noShowToday)}
            tone={noShowToday > 0 ? "warn" : "good"}
          />
        ) : null}
        {showTxn ? (
          <CloseStat
            label={labels.txnToday || "Txns today"}
            value={String(txnToday)}
            tone={txnToday === 0 ? "warn" : "good"}
          />
        ) : null}
        <CloseStat
          label={labels.lhdnPending}
          value={String(lhdnPendingCount)}
          tone={lhdnPendingCount > 0 ? "alert" : "good"}
        />
        <CloseStat
          label={labels.lhdnRejected}
          value={String(lhdnRejectedCount)}
          tone={lhdnRejectedCount > 0 ? "alert" : "good"}
        />
      </div>
      <div style={{ marginTop: "0.85rem" }}>
        <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 4 }}>
          {labels.lowStock}
        </div>
        {stockPreview.length ? (
          <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>
            {stockPreview.join(", ")}
            {stockExtra > 0 ? ` (+${stockExtra})` : ""}
          </p>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            {labels.none}
          </p>
        )}
      </div>
      {floorRiskItems.length ? (
        <div
          style={{
            marginTop: "0.85rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.65rem",
          }}
        >
          {floorRiskItems.slice(0, 5).map((item) =>
            item.href ? (
              <Link key={item.label} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
                <CloseStat
                  label={item.label}
                  value={item.value}
                  tone={item.tone || "warn"}
                />
              </Link>
            ) : (
              <CloseStat
                key={item.label}
                label={item.label}
                value={item.value}
                tone={item.tone || "warn"}
              />
            )
          )}
        </div>
      ) : null}
      <div className="row" style={{ marginTop: "0.85rem", flexWrap: "wrap", gap: 8 }}>
        <Link href="/invoices" className="btn btn-soft">
          {labels.openInvoices}
        </Link>
        <Link href="/inventory" className="btn btn-soft">
          {labels.openInventory}
        </Link>
        <Link href="/lhdn" className="btn btn-soft">
          {labels.openLhdn}
        </Link>
        {labels.openPos ? (
          <Link href="/pos" className="btn btn-soft">
            {labels.openPos}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function CloseStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "alert";
}) {
  const bg =
    tone === "good"
      ? "rgba(22, 163, 74, 0.1)"
      : tone === "warn"
        ? "rgba(202, 138, 4, 0.12)"
        : "rgba(220, 38, 38, 0.1)";
  return (
    <div
      style={{
        padding: "0.65rem 0.75rem",
        borderRadius: 12,
        background: bg,
      }}
    >
      <div className="muted" style={{ fontSize: "0.75rem" }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: "1.05rem", marginTop: 2 }}>{value}</div>
    </div>
  );
}
