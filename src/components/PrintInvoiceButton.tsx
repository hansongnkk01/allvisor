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
        const body = document.body;
        body.classList.add("printing-invoice");

        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          body.classList.remove("printing-invoice");
          window.removeEventListener("afterprint", cleanup);
          mql?.removeEventListener?.("change", onMql);
        };

        const onMql = (e: MediaQueryListEvent) => {
          if (!e.matches) cleanup();
        };
        const mql = window.matchMedia?.("print");
        mql?.addEventListener?.("change", onMql);
        window.addEventListener("afterprint", cleanup);

        window.print();
      }}
    >
      {label}
    </button>
  );
}
