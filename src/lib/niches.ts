import type { Niche } from "./types";

export const NICHES: Niche[] = ["clinic", "retail"];

export function isNiche(value: string | null | undefined): value is Niche {
  return value === "clinic" || value === "retail";
}

export function isClinicNiche(niche: Niche | string | null | undefined): boolean {
  return niche === "clinic";
}

export function isRetailNiche(niche: Niche | string | null | undefined): boolean {
  return niche === "retail";
}

/** Flat nav keys (clinic: staff then admin). */
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
    "cash",
    "invoices",
    "receipts",
    "categories",
    "inventory",
    "logistics",
    "printers",
    "admin",
    "accounting",
    "lhdn",
  ],
} as const;

export const ADMIN_ZONE_NAV_KEYS = new Set(["admin", "accounting", "lhdn"]);

/** Grouped retail sidebar: Operations → Settings → Admin zone */
export const retailNavSections = [
  {
    id: "operations",
    labelKey: "operationsZone" as const,
    keys: ["dashboard", "customers", "pos", "cash", "invoices"] as const,
  },
  {
    id: "settings",
    labelKey: "settingsZone" as const,
    keys: ["receipts", "categories", "inventory", "logistics", "printers"] as const,
  },
  {
    id: "admin",
    labelKey: "adminZone" as const,
    keys: ["admin", "accounting", "lhdn"] as const,
  },
];

export type NavKey =
  | (typeof nicheNavKeys)["clinic"][number]
  | (typeof nicheNavKeys)["retail"][number]
  | "pos";
