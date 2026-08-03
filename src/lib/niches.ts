import type { Niche } from "./types";
import {
  getNavSectionsForNiche,
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
  NICHE_DEFINITIONS,
  type Capability,
};
