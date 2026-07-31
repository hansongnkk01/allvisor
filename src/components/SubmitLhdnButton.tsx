"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  cancelInvoiceLhdnAction,
  submitInvoiceToLhdnAction,
} from "@/app/actions";
import { RefreshLhdnStatusButton } from "@/components/RefreshLhdnStatusButton";

function asMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "Unknown error";
  try {
    return JSON.stringify(value);
  } catch {
    return "Submit failed";
  }
}

export function SubmitLhdnButton({
  invoiceId,
  label,
  hint,
  disabledReason,
  refreshLabel,
  hasUuid,
  currentStatusLabel,
  cancelLabel,
  cancelHint,
  cancelPrompt,
  canCancel,
}: {
  invoiceId: string;
  label: string;
  hint?: string;
  disabledReason?: string | null;
  refreshLabel?: string;
  hasUuid?: boolean;
  currentStatusLabel?: string | null;
  cancelLabel?: string;
  cancelHint?: string;
  cancelPrompt?: string;
  canCancel?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (disabledReason && !hasUuid) {
    return (
      <div className="surface no-print" style={{ padding: "1.25rem" }}>
        <p className="muted" style={{ margin: 0 }}>
          {disabledReason}
        </p>
      </div>
    );
  }

  return (
    <div className="surface no-print" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{label}</h3>
      {hint ? (
        <p className="muted" style={{ marginTop: 0 }}>
          {hint}
        </p>
      ) : null}
      {currentStatusLabel ? (
        <p style={{ margin: "0 0 0.75rem", fontWeight: 600 }}>
          {currentStatusLabel}
        </p>
      ) : null}
      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        {!disabledReason ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={() => {
              setError(null);
              setOk(null);
              startTransition(async () => {
                try {
                  const result = await submitInvoiceToLhdnAction(invoiceId);
                  if (result && "error" in result && result.error) {
                    setError(asMessage(result.error));
                    return;
                  }
                  const uuid =
                    result && "uuid" in result && typeof result.uuid === "string"
                      ? result.uuid
                      : null;
                  const my =
                    result && "myinvoisStatus" in result && result.myinvoisStatus
                      ? String(result.myinvoisStatus)
                      : "Submitted";
                  const summary =
                    result &&
                    "validationSummary" in result &&
                    result.validationSummary
                      ? `\n${result.validationSummary}`
                      : "";
                  setOk(
                    uuid
                      ? `${my} (UUID: ${uuid})${summary}`
                      : `${my}${summary}`
                  );
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Submit failed");
                }
              });
            }}
          >
            {pending ? "Submitting & checking status…" : label}
          </button>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            {disabledReason}
          </p>
        )}
        {canCancel && cancelLabel ? (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: "var(--danger)" }}
            disabled={pending}
            onClick={() => {
              const reason = window.prompt(
                cancelPrompt || "Cancel reason (required):",
                ""
              );
              if (reason === null) return;
              setError(null);
              setOk(null);
              startTransition(async () => {
                try {
                  const result = await cancelInvoiceLhdnAction(
                    invoiceId,
                    reason || undefined
                  );
                  if (result && "error" in result && result.error) {
                    setError(asMessage(result.error));
                    return;
                  }
                  setOk("Cancelled on MyInvois");
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Cancel failed");
                }
              });
            }}
          >
            {pending ? "Cancelling…" : cancelLabel}
          </button>
        ) : null}
      </div>
      {canCancel && cancelHint ? (
        <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
          {cancelHint}
        </p>
      ) : null}
      {hasUuid && refreshLabel ? (
        <RefreshLhdnStatusButton
          invoiceId={invoiceId}
          label={refreshLabel}
        />
      ) : null}
      {error ? (
        <p
          style={{
            color: "var(--danger)",
            margin: "0.5rem 0 0",
            fontSize: "0.9rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {error}
        </p>
      ) : null}
      {ok ? (
        <p
          style={{
            color: "var(--success, #0a7)",
            margin: "0.5rem 0 0",
            fontSize: "0.9rem",
            whiteSpace: "pre-wrap",
          }}
        >
          {ok}
        </p>
      ) : null}
    </div>
  );
}
