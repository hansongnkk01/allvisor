"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ message: "" });
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((input) => {
    const next = typeof input === "string" ? { message: input } : input;
    setOpts(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function finish(value: boolean) {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  }

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 220,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                background: "rgba(28, 27, 25, 0.42)",
                backdropFilter: "blur(4px)",
              }}
              onClick={() => finish(false)}
            >
              <div
                className="surface"
                style={{
                  width: "min(420px, 100%)",
                  padding: "1.25rem 1.35rem",
                  boxShadow: "0 24px 60px rgba(28,27,25,0.28)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="display"
                  style={{ fontSize: "1.35rem", marginBottom: 8 }}
                >
                  {opts.title || "Allvisor"}
                </div>
                <p style={{ margin: "0 0 1.15rem", lineHeight: 1.5 }}>{opts.message}</p>
                <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => finish(false)}
                  >
                    {opts.cancelLabel || "Cancel"}
                  </button>
                  <button
                    type="button"
                    className={opts.danger ? "btn btn-primary" : "btn btn-primary"}
                    style={
                      opts.danger
                        ? { background: "var(--danger)", borderColor: "var(--danger)" }
                        : undefined
                    }
                    onClick={() => finish(true)}
                    autoFocus
                  >
                    {opts.confirmLabel || "Confirm"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return async (input: ConfirmOptions | string) => {
      const message = typeof input === "string" ? input : input.message;
      return window.confirm(message);
    };
  }
  return ctx;
}
