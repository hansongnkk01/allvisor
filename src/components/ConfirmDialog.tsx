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

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Hide cancel button (info / success alerts) */
  hideCancel?: boolean;
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
  const closingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const showNext = useCallback(() => {
    if (activeRef.current) return;
    const next = queueRef.current.shift() || null;
    if (!next) {
      setOpen(false);
      return;
    }
    activeRef.current = next;
    closingRef.current = false;
    setOpts(next.opts);
    setOpen(true);
  }, []);

  const scheduleShowNext = useCallback(() => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      showNext();
    }, 50);
  }, [showNext]);

  const confirm = useCallback<ConfirmFn>(
    (input) => {
      const nextOpts = typeof input === "string" ? { message: input } : input;
      return new Promise<boolean>((resolve) => {
        queueRef.current.push({ opts: nextOpts, resolve });
        if (!activeRef.current && !closingRef.current) {
          scheduleShowNext();
        }
      });
    },
    [scheduleShowNext]
  );

  const finish = useCallback(
    (value: boolean) => {
      const active = activeRef.current;
      if (!active) return;
      activeRef.current = null;
      closingRef.current = true;
      setOpen(false);

      // Resolve after paint so the click handler doesn't block INP for seconds
      window.setTimeout(() => {
        active.resolve(value);
        closingRef.current = false;
        if (queueRef.current.length) showNext();
      }, 0);
    },
    [showNext]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

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
                <p style={{ margin: "0 0 1.15rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {opts.message}
                </p>
                <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                  {!opts.hideCancel ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => finish(false)}
                    >
                      {opts.cancelLabel || "Cancel"}
                    </button>
                  ) : null}
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
