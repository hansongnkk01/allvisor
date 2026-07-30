"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { flushSync } from "react-dom";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

type QueueItem = {
  opts: ConfirmOptions;
  resolve: (v: boolean) => void;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ message: "" });
  const queueRef = useRef<QueueItem[]>([]);
  const activeRef = useRef<QueueItem | null>(null);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift() || null;
    activeRef.current = next;
    if (!next) {
      flushSync(() => setOpen(false));
      return;
    }
    flushSync(() => {
      setOpts(next.opts);
      setOpen(true);
    });
  }, []);

  const confirm = useCallback<ConfirmFn>(
    (input) => {
      const nextOpts = typeof input === "string" ? { message: input } : input;
      return new Promise<boolean>((resolve) => {
        queueRef.current.push({ opts: nextOpts, resolve });
        if (!activeRef.current) showNext();
      });
    },
    [showNext]
  );

  function finish(value: boolean) {
    const active = activeRef.current;
    activeRef.current = null;
    flushSync(() => setOpen(false));
    active?.resolve(value);
    // Allow UI to close before next dialog (double-confirm flow)
    window.setTimeout(() => showNext(), 40);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                background: "rgba(28, 27, 25, 0.45)",
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
                  background: "#fff",
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
                    className="btn btn-primary"
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
