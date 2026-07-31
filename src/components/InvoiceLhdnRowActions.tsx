"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  cancelInvoiceLhdnAction,
  submitInvoiceToLhdnAction,
} from "@/app/actions";

function asMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "Failed";
  try {
    return JSON.stringify(value);
  } catch {
    return "Failed";
  }
}

const btnStyle: CSSProperties = {
  padding: "0.35rem 0.65rem",
  fontSize: "0.8rem",
  whiteSpace: "nowrap",
};

export function InvoiceLhdnRowActions({
  invoiceId,
  canSubmit,
  canCancel,
  lhdnLabel,
  labels,
}: {
  invoiceId: string;
  canSubmit: boolean;
  canCancel: boolean;
  lhdnLabel?: string | null;
  labels: {
    submit: string;
    cancel: string;
    cancelPrompt: string;
    submitting: string;
    cancelling: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="stack" style={{ gap: "0.35rem", alignItems: "flex-start" }}>
      {lhdnLabel ? (
        <span className="badge" style={{ fontSize: "0.75rem" }}>
          {lhdnLabel}
        </span>
      ) : null}
      <div className="row" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-primary"
          style={btnStyle}
          disabled={pending || !canSubmit}
          title={!canSubmit ? undefined : labels.submit}
          onClick={() => {
            if (!canSubmit) return;
            setErr(null);
            setMsg(null);
            startTransition(async () => {
              try {
                const result = await submitInvoiceToLhdnAction(invoiceId);
                if (result && "error" in result && result.error) {
                  setErr(asMessage(result.error));
                  return;
                }
                const st =
                  result && "myinvoisStatus" in result && result.myinvoisStatus
                    ? String(result.myinvoisStatus)
                    : "Submitted";
                setMsg(st);
                router.refresh();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Submit failed");
              }
            });
          }}
        >
          {pending ? labels.submitting : labels.submit}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ ...btnStyle, color: "var(--danger)" }}
          disabled={pending || !canCancel}
          onClick={() => {
            if (!canCancel) return;
            const reason = window.prompt(labels.cancelPrompt, "");
            if (reason === null) return;
            setErr(null);
            setMsg(null);
            startTransition(async () => {
              try {
                const result = await cancelInvoiceLhdnAction(
                  invoiceId,
                  reason || undefined
                );
                if (result && "error" in result && result.error) {
                  setErr(asMessage(result.error));
                  return;
                }
                setMsg("Cancelled");
                router.refresh();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Cancel failed");
              }
            });
          }}
        >
          {pending ? labels.cancelling : labels.cancel}
        </button>
      </div>
      {err ? (
        <span style={{ color: "var(--danger)", fontSize: "0.75rem", maxWidth: 220 }}>
          {err}
        </span>
      ) : null}
      {msg ? (
        <span style={{ color: "var(--success, #0a7)", fontSize: "0.75rem" }}>{msg}</span>
      ) : null}
    </div>
  );
}
