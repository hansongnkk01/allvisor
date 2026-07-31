"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { refreshLhdnDocumentStatusAction } from "@/app/actions";

function asMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "Unknown error";
  try {
    return JSON.stringify(value);
  } catch {
    return "Refresh failed";
  }
}

export function RefreshLhdnStatusButton({
  invoiceId,
  label,
  currentLabel,
}: {
  invoiceId: string;
  label: string;
  currentLabel?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  return (
    <div style={{ marginTop: "0.75rem" }}>
      {currentLabel ? (
        <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>
          {currentLabel}
        </p>
      ) : null}
      <button
        type="button"
        className="btn btn-soft"
        disabled={pending}
        onClick={() => {
          setError(null);
          setOk(null);
          startTransition(async () => {
            try {
              const result = await refreshLhdnDocumentStatusAction(invoiceId);
              if (result && "error" in result && result.error) {
                setError(asMessage(result.error));
                return;
              }
              const status =
                result && "myinvoisStatus" in result
                  ? String(result.myinvoisStatus)
                  : "Updated";
              const summary =
                result && "validationSummary" in result && result.validationSummary
                  ? ` — ${result.validationSummary}`
                  : "";
              setOk(`${status}${summary}`);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Refresh failed");
            }
          });
        }}
      >
        {pending ? "Checking…" : label}
      </button>
      {error ? (
        <p style={{ color: "var(--danger)", margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
          {error}
        </p>
      ) : null}
      {ok ? (
        <p style={{ color: "var(--success, #0a7)", margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
          {ok}
        </p>
      ) : null}
    </div>
  );
}
