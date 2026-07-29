import type { Niche } from "./types";

export const NICHES: Niche[] = ["clinic", "retail"];

export function isNiche(value: string | null | undefined): value is Niche {
  return value === "clinic" || value === "retail";
}

export const nicheNavKeys = {
  clinic: [
    "dashboard",
    "customers",
    "appointments",
    "invoices",
    "inventory",
    "accounting",
    "lhdn",
    "settings",
    "admin",
  ],
  retail: [
    "dashboard",
    "customers",
    "pos",
    "inventory",
    "invoices",
    "accounting",
    "lhdn",
    "settings",
    "admin",
  ],
} as const;

export type NavKey = (typeof nicheNavKeys)["clinic"][number] | "pos";
