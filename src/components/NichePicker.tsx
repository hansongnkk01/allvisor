"use client";

import { useTranslations } from "next-intl";
import { NICHE_DEFINITIONS, nichesInGroup } from "@/lib/niche-capabilities";
import type { Niche } from "@/lib/types";

const GROUPS: Array<{
  id: "care" | "shop" | "hybrid" | "hospitality" | "specialty";
  labelKey: "groupCare" | "groupShop" | "groupHybrid" | "groupHospitality" | "groupSpecialty";
}> = [
  { id: "care", labelKey: "groupCare" },
  { id: "shop", labelKey: "groupShop" },
  { id: "hybrid", labelKey: "groupHybrid" },
  { id: "hospitality", labelKey: "groupHospitality" },
  { id: "specialty", labelKey: "groupSpecialty" },
];

export function NichePicker({
  value,
  onChange,
}: {
  value: Niche;
  onChange: (niche: Niche) => void;
}) {
  const t = useTranslations("Auth");

  return (
    <div className="stack" style={{ gap: "0.85rem" }}>
      {GROUPS.map((group) => {
        const niches = nichesInGroup(group.id);
        if (!niches.length) return null;
        return (
          <div key={group.id}>
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.35rem", fontWeight: 600 }}>
              {t(group.labelKey)}
            </div>
            <div className="row" style={{ flexWrap: "wrap", gap: "0.4rem" }}>
              {niches.map((id) => {
                const def = NICHE_DEFINITIONS[id];
                const active = value === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={active ? "btn btn-soft" : "btn btn-ghost"}
                    style={{ fontSize: "0.85rem", padding: "0.4rem 0.65rem" }}
                    onClick={() => onChange(id)}
                  >
                    {t(def.labelKey as "nicheClinic")}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
