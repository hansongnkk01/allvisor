"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";

export type ActionConflict = {
  name: string;
  email?: string | null;
  phone?: string | null;
  ic_number?: string | null;
  matchedOn?: string[];
};

export type ActionResult = {
  error?: string;
  conflicts?: ActionConflict[];
  success?: boolean;
};

export function ActionForm({
  action,
  children,
  onSuccess,
  className,
  style,
}: {
  action: (formData: FormData) => Promise<ActionResult | void>;
  children: React.ReactNode;
  onSuccess?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ActionConflict[]>([]);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={className}
      style={{
        ...style,
        opacity: pending ? 0.72 : 1,
        transition: "opacity 120ms ease",
        pointerEvents: pending ? "none" : undefined,
      }}
      action={(formData) => {
        setError(null);
        setConflicts([]);
        startTransition(async () => {
          try {
            const result = await action(formData);
            if (result && "error" in result && result.error) {
              setError(result.error);
              setConflicts(result.conflicts || []);
              return;
            }
            router.refresh();
            onSuccess?.();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
          }
        });
      }}
    >
      {children}
      {error ? (
        <div
          style={{
            marginTop: "0.65rem",
            padding: "0.7rem 0.85rem",
            borderRadius: 10,
            background: "rgba(220, 38, 38, 0.08)",
            border: "1px solid rgba(220, 38, 38, 0.35)",
            color: "var(--danger)",
            fontSize: "0.9rem",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
          {conflicts.length ? (
            <div className="stack" style={{ gap: "0.45rem", marginTop: 8 }}>
              {conflicts.map((c, i) => (
                <div
                  key={`${c.name}-${c.ic_number || ""}-${c.email || ""}-${i}`}
                  style={{
                    padding: "0.45rem 0.55rem",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.7)",
                    color: "var(--ink)",
                    fontSize: "0.85rem",
                  }}
                >
                  <div>
                    <strong>{c.name}</strong>
                    {c.matchedOn?.length ? (
                      <span className="muted"> · matched: {c.matchedOn.join(", ")}</span>
                    ) : null}
                  </div>
                  <div className="muted" style={{ marginTop: 2 }}>
                    {[
                      c.email ? `Email: ${c.email}` : null,
                      c.ic_number ? `IC: ${c.ic_number}` : null,
                      c.phone ? `Phone: ${c.phone}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No contact details on file"}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {pending ? (
        <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
          Saving…
        </p>
      ) : null}
    </form>
  );
}
