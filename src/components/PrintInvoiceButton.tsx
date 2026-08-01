"use client";

import type { CSSProperties } from "react";
import { logInvoicePrintAction } from "@/app/actions";

export function PrintInvoiceButton({
  label,
  invoiceId,
  style,
}: {
  label: string;
  invoiceId?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      className="btn btn-primary"
      style={style}
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
