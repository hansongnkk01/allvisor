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
}: {
  invoiceId: string;
  balance: number;
  labels: {
    title: string;
    balanceDue: string;
    pay: string;
  };
  onSuccess?: () => void;
}) {
  const [amount, setAmount] = useState(String(Number(balance.toFixed(2))));

  useEffect(() => {
    setAmount(String(Number(balance.toFixed(2))));
  }, [balance]);

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
