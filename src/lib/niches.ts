import type { Niche } from "./types";

export const NICHES: Niche[] = ["clinic", "retail"];

export function isNiche(value: string | null | undefined): value is Niche {
  return value === "clinic" || value === "retail";
}

/** Staff zone first, then Admin zone (Admin / Accounting / LHDN). */
export const nicheNavKeys = {
  clinic: [
    "dashboard",
    "customers",
    "appointments",
    "invoices",
    "inventory",
    "admin",
    "accounting",
    "lhdn",
  ],
  retail: [
    "dashboard",
    "customers",
    "pos",
    "inventory",
    "invoices",
    "admin",
    "accounting",
    "lhdn",
  ],
} as const;

export const ADMIN_ZONE_NAV_KEYS = new Set(["admin", "accounting", "lhdn"]);

export type NavKey = (typeof nicheNavKeys)["clinic"][number] | "pos";
