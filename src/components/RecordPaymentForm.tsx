"use client";

import { useState, type CSSProperties } from "react";
import { ActionForm } from "@/components/ActionForm";
import { recordPaymentAction } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";

const COMPACT_CTRL: CSSProperties = {
  height: 40,
  padding: "0 0.75rem",
  fontSize: "0.9rem",
  boxSizing: "border-box",
};

/** Keeps payment amount in sync with the latest balance due. */
export function RecordPaymentForm({
  invoiceId,
  balance,
  labels,
  onSuccess,
  compact = false,
}: {
  invoiceId: string;
  balance: number;
  labels: {
    title: string;
    balanceDue: string;
    pay: string;
  };
  onSuccess?: () => void;
  /** Compact strip for invoice preview header (beside Print). */
  compact?: boolean;
}) {
  const [amount, setAmount] = useState(String(Number(balance.toFixed(2))));

  // Re-seed the amount when a different balance arrives (adjust during render).
  const [prevBalance, setPrevBalance] = useState(balance);
  if (balance !== prevBalance) {
    setPrevBalance(balance);
    setAmount(String(Number(balance.toFixed(2))));
  }

  if (compact) {
    return (
      <div
        className="no-print"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          minWidth: 0,
        }}
      >
        <div
          className="muted"
          style={{ fontSize: "0.78rem", margin: 0, lineHeight: 1.2, paddingLeft: 2 }}
        >
          {labels.balanceDue}: {formatCurrency(balance)}
        </div>
        <ActionForm
          action={recordPaymentAction}
          className="row"
          style={{ gap: 6, margin: 0, flexWrap: "nowrap", alignItems: "center" }}
          onSuccess={() => onSuccess?.()}
        >
          <input type="hidden" name="invoice_id" value={invoiceId} />
          <input
            name="amount"
            type="number"
            step="0.01"
            min={0}
            className="input"
            style={{ ...COMPACT_CTRL, width: 84 }}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            key={`amount-${balance}`}
            aria-label={labels.balanceDue}
          />
          <select
            name="method"
            className="select"
            style={{ ...COMPACT_CTRL, width: 96 }}
            defaultValue="cash"
            aria-label="Payment method"
          >
            <option value="cash">cash</option>
            <option value="card">card</option>
            <option value="transfer">transfer</option>
            <option value="ewallet">ewallet</option>
          </select>
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              ...COMPACT_CTRL,
              minWidth: 88,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "nowrap",
            }}
          >
            {labels.pay}
          </button>
        </ActionForm>
      </div>
    );
  }

  return (
    <div className="surface no-print" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{labels.title}</h3>
      <p className="muted">
        {labels.balanceDue}: {formatCurrency(balance)}
      </p>
      <ActionForm
        action={recordPaymentAction}
        className="row"
        onSuccess={() => onSuccess?.()}
      >
        <input type="hidden" name="invoice_id" value={invoiceId} />
        <input
          name="amount"
          type="number"
          step="0.01"
          min={0}
          className="input"
          style={{ width: 140 }}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          key={`amount-${balance}`}
        />
        <select name="method" className="select" style={{ width: 130 }} defaultValue="cash">
          <option value="cash">cash</option>
          <option value="card">card</option>
          <option value="transfer">transfer</option>
          <option value="ewallet">ewallet</option>
        </select>
        <button type="submit" className="btn btn-primary">
          {labels.pay}
        </button>
      </ActionForm>
    </div>
  );
}
