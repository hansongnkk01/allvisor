"use client";

import type { CSSProperties } from "react";

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

export function PatientName({
  name,
  risk,
  style,
}: {
  name: string;
  risk?: RiskLevel;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      <span>{name}</span>
      <RiskDot risk={risk} />
    </span>
  );
}
