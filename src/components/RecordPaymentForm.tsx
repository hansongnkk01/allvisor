"use client";

import { useEffect, useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { recordPaymentAction } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";

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

  useEffect(() => {
    setAmount(String(Number(balance.toFixed(2))));
  }, [balance]);

  if (compact) {
    return (
      <div
        className="surface no-print"
        style={{
          padding: "0.45rem 0.55rem",
          boxShadow: "none",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: 320,
        }}
      >
        <div className="muted" style={{ fontSize: "0.78rem", margin: 0, lineHeight: 1.2 }}>
          {labels.balanceDue}: {formatCurrency(balance)}
        </div>
        <ActionForm
          action={recordPaymentAction}
          className="row"
          style={{ gap: 6, margin: 0, flexWrap: "nowrap" }}
          onSuccess={() => onSuccess?.()}
        >
          <input type="hidden" name="invoice_id" value={invoiceId} />
          <input
            name="amount"
            type="number"
            step="0.01"
            min={0}
            className="input"
            style={{ width: 78, padding: "0.35rem 0.45rem", fontSize: "0.85rem" }}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            key={`amount-${balance}`}
          />
          <select
            name="method"
            className="select"
            style={{ width: 88, padding: "0.35rem 0.4rem", fontSize: "0.85rem" }}
            defaultValue="cash"
          >
            <option value="cash">cash</option>
            <option value="card">card</option>
            <option value="transfer">transfer</option>
            <option value="ewallet">ewallet</option>
          </select>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: "0.35rem 0.7rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
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
