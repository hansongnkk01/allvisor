"use client";

import { useState, useTransition } from "react";

export function ActionForm({
  action,
  children,
  onSuccess,
  className,
  style,
}: {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean } | void>;
  children: React.ReactNode;
  onSuccess?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={className}
      style={style}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await action(formData);
          if (result && "error" in result && result.error) {
            setError(result.error);
            return;
          }
          onSuccess?.();
        });
      }}
    >
      {children}
      {error ? (
        <p style={{ color: "var(--danger)", margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
          {error}
        </p>
      ) : null}
      {pending ? (
        <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
          …
        </p>
      ) : null}
    </form>
  );
}
