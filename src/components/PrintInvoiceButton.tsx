"use client";

import type { CSSProperties } from "react";
import { logInvoicePrintAction } from "@/app/actions";

export function PrintInvoiceButton({
  label,
  invoiceId,
  style,
  demoMode = false,
}: {
  label: string;
  invoiceId?: string;
  style?: CSSProperties;
  /** Homepage demo — local print UI only, no server log. */
  demoMode?: boolean;
}) {
  return (
    <button
      type="button"
      className="btn btn-primary"
      style={style}
      onClick={() => {
        if (invoiceId && !demoMode) {
          void logInvoicePrintAction(invoiceId);
        }
        const body = document.body;
        body.classList.add("printing-invoice");
        // Close any open allergy hover tip before print
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

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
