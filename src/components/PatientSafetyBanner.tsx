import type { RiskLevel } from "@/components/PatientName";

export function needsSafetyBanner(
  risk?: RiskLevel | null,
  allergies?: string | null
) {
  const hasAllergy = Boolean((allergies || "").trim());
  return risk === "high" || hasAllergy;
}

/** Red banner for high risk and/or known allergies (allergies clinic-only). */
export function PatientSafetyBanner({
  risk,
  allergies,
  compact = false,
  showAllergies = true,
}: {
  risk?: RiskLevel | null;
  allergies?: string | null;
  compact?: boolean;
  /** When false (retail), only high-risk is shown — no allergy text. */
  showAllergies?: boolean;
}) {
  const allergyText = showAllergies ? (allergies || "").trim() : "";
  if (!needsSafetyBanner(risk, allergyText || null)) return null;
  const parts: string[] = [];
  if (risk === "high") parts.push("HIGH RISK");
  if (allergyText) parts.push(`Allergy: ${allergyText}`);

  return (
    <div
      role="alert"
      className="allergy-print-hide"
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
