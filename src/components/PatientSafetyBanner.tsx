import type { RiskLevel } from "@/components/PatientName";

export function needsSafetyBanner(
  risk?: RiskLevel | null,
  allergies?: string | null
) {
  const hasAllergy = Boolean((allergies || "").trim());
  return risk === "high" || hasAllergy;
}

/** Red banner for high risk and/or known allergies. */
export function PatientSafetyBanner({
  risk,
  allergies,
  compact = false,
}: {
  risk?: RiskLevel | null;
  allergies?: string | null;
  compact?: boolean;
}) {
  if (!needsSafetyBanner(risk, allergies)) return null;
  const allergyText = (allergies || "").trim();
  const parts: string[] = [];
  if (risk === "high") parts.push("HIGH RISK");
  if (allergyText) parts.push(`Allergy: ${allergyText}`);

  return (
    <div
      role="alert"
      style={{
        margin: compact ? "0.35rem 0" : "0.65rem 0",
        padding: compact ? "0.4rem 0.55rem" : "0.55rem 0.75rem",
        borderRadius: 10,
        background: "rgba(220, 38, 38, 0.12)",
        border: "1px solid rgba(220, 38, 38, 0.45)",
        color: "#b91c1c",
        fontSize: compact ? "0.8rem" : "0.9rem",
        fontWeight: 700,
        lineHeight: 1.35,
      }}
    >
      ⚠ {parts.join(" · ")}
    </div>
  );
}
