import type { Niche } from "./types";
import {
  getNavSectionsForNiche,
  getNavSectionsForRole,
  getNicheDef,
  hasCapability,
  NICHE_DEFINITIONS,
  nicheNavKeysList,
  type Capability,
} from "./niche-capabilities";

export const NICHES: Niche[] = Object.keys(NICHE_DEFINITIONS) as Niche[];

export function isNiche(value: string | null | undefined): value is Niche {
  return !!value && value in NICHE_DEFINITIONS;
}

export function isClinicNiche(niche: Niche | string | null | undefined): boolean {
  return niche === "clinic";
}

export function isRetailNiche(niche: Niche | string | null | undefined): boolean {
  return niche === "retail";
}

/** Tuition centre only — do not use class_schedule (gym shares it). */
export function isTuitionNiche(niche: Niche | string | null | undefined): boolean {
  return niche === "tuition";
}

/** @deprecated Prefer hasCapability — kept for gradual migration */
export function isCareLikeNiche(niche: Niche | string | null | undefined): boolean {
  return hasCapability(niche, "appointments") || hasCapability(niche, "allergies");
}

/** @deprecated Prefer hasCapability */
export function isCommerceLikeNiche(niche: Niche | string | null | undefined): boolean {
  return hasCapability(niche, "pos");
}

export const nicheNavKeys = {
  clinic: nicheNavKeysList("clinic"),
  retail: nicheNavKeysList("retail"),
} as const;

export const ADMIN_ZONE_NAV_KEYS = new Set(["admin", "accounting", "lhdn"]);

/** @deprecated Use getNavSectionsForNiche */
export const retailNavSections = getNavSectionsForNiche("retail");

export type NavKey = string;

export {
  hasCapability,
  getNicheDef,
  getNavSectionsForNiche,
  getNavSectionsForRole,
  NICHE_DEFINITIONS,
  type Capability,
};

export { getNicheVocab, vocabLabels, accountingCategories } from "./niche-vocab";
export type { NicheVocab, NicheVocabLabels, AccountingFlavor } from "./niche-vocab";
