"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { submitInvoiceToLhdnAction } from "@/app/actions";

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
}: {
  invoiceId: string;
  label: string;
  hint?: string;
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (disabledReason) {
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
              setOk(uuid ? `Submitted (UUID: ${uuid})` : "Submitted to LHDN");
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Submit failed");
            }
          });
        }}
      >
        {pending ? "Submitting…" : label}
      </button>
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
        <p style={{ color: "var(--success, #0a7)", margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
          {ok}
        </p>
      ) : null}
    </div>
  );
}
