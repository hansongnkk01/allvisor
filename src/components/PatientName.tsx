"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

export type RiskLevel = "high" | "medium" | "low" | null | undefined;

const RISK_COLOR: Record<"high" | "medium" | "low", string> = {
  high: "#dc2626",
  medium: "#ca8a04",
  low: "#16a34a",
};

export function RiskDot({
  risk,
  size = 8,
}: {
  risk: RiskLevel;
  size?: number;
}) {
  if (!risk) return null;
  return (
    <span
      title={risk}
      aria-label={`${risk} risk`}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: RISK_COLOR[risk],
        flexShrink: 0,
        boxShadow: `0 0 0 2px ${RISK_COLOR[risk]}22`,
      }}
    />
  );
}

/** Patient name with risk dot + hover allergy tip (follows the name everywhere). */
export function PatientName({
  name,
  risk,
  allergies,
  style,
}: {
  name: string;
  risk?: RiskLevel;
  allergies?: string | null;
  style?: CSSProperties;
}) {
  const allergyText = (allergies || "").trim();
  const tipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const placeTip = useCallback(() => {
    if (!allergyText || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const tipW = 260;
    const left = Math.min(
      Math.max(8, r.left),
      (typeof window !== "undefined" ? window.innerWidth : 400) - tipW - 8
    );
    const top = r.bottom + 8;
    setPos({ top, left });
    setOpen(true);
  }, [allergyText]);

  const hideTip = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => placeTip();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, placeTip]);

  const tip =
    mounted && open && pos && allergyText
      ? createPortal(
          <div
            id={tipId}
            role="tooltip"
            className="allergy-print-hide"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 10050,
              width: "min(260px, calc(100vw - 16px))",
              padding: "0.55rem 0.7rem",
              borderRadius: 10,
              background: "#fff",
              border: "1px solid rgba(220, 38, 38, 0.45)",
              boxShadow: "0 12px 32px rgba(28, 27, 25, 0.18)",
              color: "#991b1b",
              fontSize: "0.82rem",
              fontWeight: 650,
              lineHeight: 1.35,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                opacity: 0.85,
                marginBottom: 3,
              }}
            >
              Allergy
            </div>
            {allergyText}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <span
        ref={anchorRef}
        onMouseEnter={placeTip}
        onMouseLeave={hideTip}
        onFocus={placeTip}
        onBlur={hideTip}
        tabIndex={allergyText ? 0 : undefined}
        aria-describedby={allergyText && open ? tipId : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          position: "relative",
          maxWidth: "100%",
          ...style,
        }}
      >
        <span
          className={allergyText ? "patient-name-allergy-text" : undefined}
          style={{
            borderBottom: allergyText
              ? "1px dotted rgba(185, 28, 28, 0.55)"
              : undefined,
            cursor: allergyText ? "help" : undefined,
          }}
        >
          {name}
        </span>
        <RiskDot risk={risk} />
        {allergyText ? (
          <span
            aria-hidden
            title="Allergy"
            className="allergy-print-hide"
            style={{
              color: "#b91c1c",
              fontSize: "0.72rem",
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            ⚠
          </span>
        ) : null}
      </span>
      {tip}
    </>
  );
}
