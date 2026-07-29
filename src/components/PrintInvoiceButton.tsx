"use client";

import { logInvoicePrintAction } from "@/app/actions";

export function PrintInvoiceButton({
  label,
  invoiceId,
}: {
  label: string;
  invoiceId?: string;
}) {
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => {
        if (invoiceId) {
          void logInvoicePrintAction(invoiceId);
        }
        window.print();
      }}
    >
      {label}
    </button>
  );
}
