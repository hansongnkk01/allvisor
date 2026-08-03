/**
 * Capability engine — single source of truth for niche isolation.
 * Pages/actions must gate via hasCapability(), not scattered niche === checks.
 */

import type { Niche } from "./types";

export type Capability =
  | "dashboard"
  | "customers"
  | "invoices"
  | "inventory"
  | "admin"
  | "accounting"
  | "lhdn"
  | "appointments"
  | "allergies"
  | "clinic_hours"
  | "pos"
  | "cash_drawer"
  | "receipts"
  | "logistics"
  | "printers"
  | "product_categories"
  | "commissions"
  | "service_duration"
  | "batch_expiry"
  | "rx_attach"
  | "eye_rx"
  | "lab_orders"
  | "class_schedule"
  | "attendance"
  | "term_fees"
  | "assessments"
  | "student_accounts"
  | "job_cards"
  | "vehicle_profile"
  | "memberships"
  | "class_checkin"
  | "pt_sessions"
  | "pet_profiles"
  | "pet_vaccinations"
  | "variants"
  | "serial_numbers"
  | "price_tiers"
  | "laundry_tickets"
  | "session_packages"
  | "lab_results"
  | "tables_kot"
  | "rooms"
  | "property_listings"
  | "courier_tracking"
  | "project_claims"
  | "bom_wip"
  | "matter_billing"
  | "event_timeline"
  | "farm_plots";

export type NicheEngine = "care" | "commerce" | "hybrid" | "fnb" | "hospitality" | "specialty";

export type NavSectionDef = {
  id: string;
  labelKey: "operationsZone" | "settingsZone" | "adminZone" | "careZone" | "studioZone";
  keys: string[];
};

export type NicheDefinition = {
  id: Niche;
  engine: NicheEngine;
  /** Signup picker group */
  group: "care" | "shop" | "hybrid" | "hospitality" | "specialty";
  capabilities: readonly Capability[];
  navSections: NavSectionDef[];
  /** Landing/register label keys under Auth / Landing */
  labelKey: string;
};

const CARE_ADMIN: NavSectionDef = {
  id: "admin",
  labelKey: "adminZone",
  keys: ["admin", "accounting", "lhdn"],
};

const SHARED_OPS_BASE = ["dashboard", "customers", "invoices"] as const;

export const NICHE_DEFINITIONS: Record<Niche, NicheDefinition> = {
  clinic: {
    id: "clinic",
    engine: "care",
    group: "care",
    labelKey: "nicheClinic",
    capabilities: [
      "dashboard",
      "customers",
      "appointments",
      "allergies",
      "clinic_hours",
      "invoices",
      "inventory",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "appointments", "invoices", "inventory"],
      },
      CARE_ADMIN,
    ],
  },
  retail: {
    id: "retail",
    engine: "commerce",
    group: "shop",
    labelKey: "nicheRetail",
    capabilities: [
      "dashboard",
      "customers",
      "pos",
      "cash_drawer",
      "receipts",
      "inventory",
      "product_categories",
      "logistics",
      "printers",
      "invoices",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "pos", "cash", "invoices"],
      },
      {
        id: "settings",
        labelKey: "settingsZone",
        keys: ["receipts", "categories", "inventory", "logistics", "printers"],
      },
      CARE_ADMIN,
    ],
  },
  salon: {
    id: "salon",
    engine: "hybrid",
    group: "hybrid",
    labelKey: "nicheSalon",
    capabilities: [
      "dashboard",
      "customers",
      "appointments",
      "service_duration",
      "commissions",
      "pos",
      "inventory",
      "product_categories",
      "invoices",
      "receipts",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "appointments", "pos", "invoices"],
      },
      {
        id: "settings",
        labelKey: "settingsZone",
        keys: ["receipts", "commissions", "categories", "inventory"],
      },
      CARE_ADMIN,
    ],
  },
  pharmacy: {
    id: "pharmacy",
    engine: "commerce",
    group: "shop",
    labelKey: "nichePharmacy",
    capabilities: [
      "dashboard",
      "customers",
      "pos",
      "cash_drawer",
      "receipts",
      "inventory",
      "product_categories",
      "batch_expiry",
      "rx_attach",
      "logistics",
      "printers",
      "invoices",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "pos", "cash", "invoices"],
      },
      {
        id: "settings",
        labelKey: "settingsZone",
        keys: ["receipts", "batches", "categories", "inventory", "logistics", "printers"],
      },
      CARE_ADMIN,
    ],
  },
  optical: {
    id: "optical",
    engine: "hybrid",
    group: "hybrid",
    labelKey: "nicheOptical",
    capabilities: [
      "dashboard",
      "customers",
      "appointments",
      "eye_rx",
      "lab_orders",
      "pos",
      "inventory",
      "product_categories",
      "invoices",
      "receipts",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "appointments", "pos", "invoices"],
      },
      {
        id: "settings",
        labelKey: "settingsZone",
        keys: ["receipts", "eyeRx", "labOrders", "categories", "inventory"],
      },
      CARE_ADMIN,
    ],
  },
  tuition: {
    id: "tuition",
    engine: "care",
    group: "care",
    labelKey: "nicheTuition",
    capabilities: [
      "dashboard",
      "customers",
      "class_schedule",
      "attendance",
      "term_fees",
      "assessments",
      "student_accounts",
      "invoices",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: [
          "dashboard",
          "customers",
          "subjects",
          "classes",
          "attendance",
          "assessments",
          "invoices",
        ],
      },
      CARE_ADMIN,
    ],
  },
  workshop: {
    id: "workshop",
    engine: "hybrid",
    group: "hybrid",
    labelKey: "nicheWorkshop",
    capabilities: [
      "dashboard",
      "customers",
      "job_cards",
      "vehicle_profile",
      "pos",
      "inventory",
      "product_categories",
      "invoices",
      "receipts",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "jobs", "pos", "invoices"],
      },
      {
        id: "settings",
        labelKey: "settingsZone",
        keys: ["receipts", "vehicles", "categories", "inventory"],
      },
      CARE_ADMIN,
    ],
  },
  gym: {
    id: "gym",
    engine: "care",
    group: "care",
    labelKey: "nicheGym",
    capabilities: [
      "dashboard",
      "customers",
      "memberships",
      "class_checkin",
      "pt_sessions",
      "class_schedule",
      "invoices",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "memberships", "classes", "checkins", "invoices"],
      },
      CARE_ADMIN,
    ],
  },
  vet: {
    id: "vet",
    engine: "care",
    group: "care",
    labelKey: "nicheVet",
    capabilities: [
      "dashboard",
      "customers",
      "pet_profiles",
      "pet_vaccinations",
      "appointments",
      "allergies",
      "inventory",
      "invoices",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "pets", "appointments", "invoices", "inventory"],
      },
      CARE_ADMIN,
    ],
  },
  fashion: {
    id: "fashion",
    engine: "commerce",
    group: "shop",
    labelKey: "nicheFashion",
    capabilities: [
      "dashboard",
      "customers",
      "pos",
      "cash_drawer",
      "receipts",
      "inventory",
      "product_categories",
      "variants",
      "logistics",
      "printers",
      "invoices",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "pos", "cash", "invoices"],
      },
      {
        id: "settings",
        labelKey: "settingsZone",
        keys: ["receipts", "variants", "categories", "inventory", "logistics", "printers"],
      },
      CARE_ADMIN,
    ],
  },
  electronics: {
    id: "electronics",
    engine: "commerce",
    group: "shop",
    labelKey: "nicheElectronics",
    capabilities: [
      "dashboard",
      "customers",
      "pos",
      "cash_drawer",
      "receipts",
      "inventory",
      "product_categories",
      "serial_numbers",
      "logistics",
      "printers",
      "invoices",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "pos", "cash", "invoices"],
      },
      {
        id: "settings",
        labelKey: "settingsZone",
        keys: ["receipts", "serials", "categories", "inventory", "logistics", "printers"],
      },
      CARE_ADMIN,
    ],
  },
  wholesale: {
    id: "wholesale",
    engine: "commerce",
    group: "shop",
    labelKey: "nicheWholesale",
    capabilities: [
      "dashboard",
      "customers",
      "pos",
      "cash_drawer",
      "receipts",
      "inventory",
      "product_categories",
      "price_tiers",
      "logistics",
      "printers",
      "invoices",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "pos", "cash", "invoices"],
      },
      {
        id: "settings",
        labelKey: "settingsZone",
        keys: ["receipts", "priceTiers", "categories", "inventory", "logistics", "printers"],
      },
      CARE_ADMIN,
    ],
  },
  laundry: {
    id: "laundry",
    engine: "commerce",
    group: "shop",
    labelKey: "nicheLaundry",
    capabilities: [
      "dashboard",
      "customers",
      "laundry_tickets",
      "pos",
      "inventory",
      "invoices",
      "receipts",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "laundry", "pos", "invoices"],
      },
      {
        id: "settings",
        labelKey: "settingsZone",
        keys: ["receipts", "inventory"],
      },
      CARE_ADMIN,
    ],
  },
  physio: {
    id: "physio",
    engine: "care",
    group: "care",
    labelKey: "nichePhysio",
    capabilities: [
      "dashboard",
      "customers",
      "appointments",
      "session_packages",
      "allergies",
      "invoices",
      "inventory",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "appointments", "packages", "invoices", "inventory"],
      },
      CARE_ADMIN,
    ],
  },
  lab: {
    id: "lab",
    engine: "care",
    group: "care",
    labelKey: "nicheLab",
    capabilities: [
      "dashboard",
      "customers",
      "appointments",
      "lab_results",
      "invoices",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "appointments", "labResults", "invoices"],
      },
      CARE_ADMIN,
    ],
  },
  fnb: {
    id: "fnb",
    engine: "fnb",
    group: "hospitality",
    labelKey: "nicheFnb",
    capabilities: [
      "dashboard",
      "customers",
      "tables_kot",
      "pos",
      "inventory",
      "product_categories",
      "cash_drawer",
      "receipts",
      "invoices",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "tables", "pos", "cash", "invoices"],
      },
      {
        id: "settings",
        labelKey: "settingsZone",
        keys: ["receipts", "categories", "inventory"],
      },
      CARE_ADMIN,
    ],
  },
  hotel: {
    id: "hotel",
    engine: "hospitality",
    group: "hospitality",
    labelKey: "nicheHotel",
    capabilities: [
      "dashboard",
      "customers",
      "rooms",
      "invoices",
      "admin",
      "accounting",
      "lhdn",
    ],
    navSections: [
      {
        id: "operations",
        labelKey: "operationsZone",
        keys: ["dashboard", "customers", "rooms", "invoices"],
      },
      CARE_ADMIN,
    ],
  },
  property: {
    id: "property",
    engine: "specialty",
    group: "specialty",
    labelKey: "nicheProperty",
    capabilities: ["dashboard", "customers", "property_listings", "invoices", "admin", "accounting", "lhdn"],
    navSections: [
      { id: "operations", labelKey: "operationsZone", keys: ["dashboard", "customers", "listings", "invoices"] },
      CARE_ADMIN,
    ],
  },
  courier: {
    id: "courier",
    engine: "specialty",
    group: "specialty",
    labelKey: "nicheCourier",
    capabilities: ["dashboard", "customers", "courier_tracking", "invoices", "admin", "accounting", "lhdn"],
    navSections: [
      { id: "operations", labelKey: "operationsZone", keys: ["dashboard", "customers", "shipments", "invoices"] },
      CARE_ADMIN,
    ],
  },
  contractor: {
    id: "contractor",
    engine: "specialty",
    group: "specialty",
    labelKey: "nicheContractor",
    capabilities: ["dashboard", "customers", "project_claims", "invoices", "admin", "accounting", "lhdn"],
    navSections: [
      { id: "operations", labelKey: "operationsZone", keys: ["dashboard", "customers", "projects", "invoices"] },
      CARE_ADMIN,
    ],
  },
  manufacturing: {
    id: "manufacturing",
    engine: "specialty",
    group: "specialty",
    labelKey: "nicheManufacturing",
    capabilities: ["dashboard", "customers", "bom_wip", "inventory", "invoices", "admin", "accounting", "lhdn"],
    navSections: [
      { id: "operations", labelKey: "operationsZone", keys: ["dashboard", "customers", "workOrders", "inventory", "invoices"] },
      CARE_ADMIN,
    ],
  },
  legal: {
    id: "legal",
    engine: "specialty",
    group: "specialty",
    labelKey: "nicheLegal",
    capabilities: ["dashboard", "customers", "matter_billing", "invoices", "admin", "accounting", "lhdn"],
    navSections: [
      { id: "operations", labelKey: "operationsZone", keys: ["dashboard", "customers", "matters", "invoices"] },
      CARE_ADMIN,
    ],
  },
  events: {
    id: "events",
    engine: "specialty",
    group: "specialty",
    labelKey: "nicheEvents",
    capabilities: ["dashboard", "customers", "event_timeline", "invoices", "admin", "accounting", "lhdn"],
    navSections: [
      { id: "operations", labelKey: "operationsZone", keys: ["dashboard", "customers", "events", "invoices"] },
      CARE_ADMIN,
    ],
  },
  farm: {
    id: "farm",
    engine: "specialty",
    group: "specialty",
    labelKey: "nicheFarm",
    capabilities: ["dashboard", "customers", "farm_plots", "inventory", "invoices", "admin", "accounting", "lhdn"],
    navSections: [
      { id: "operations", labelKey: "operationsZone", keys: ["dashboard", "customers", "plots", "inventory", "invoices"] },
      CARE_ADMIN,
    ],
  },
};

/** Nav key → href (shared across niches). */
export const NAV_HREF: Record<string, string> = {
  dashboard: "/dashboard",
  customers: "/customers",
  appointments: "/appointments",
  inventory: "/inventory",
  invoices: "/invoices",
  accounting: "/accounting",
  lhdn: "/lhdn",
  admin: "/admin",
  pos: "/pos",
  receipts: "/receipts",
  cash: "/cash",
  categories: "/categories",
  logistics: "/logistics",
  printers: "/printers",
  commissions: "/commissions",
  batches: "/batches",
  eyeRx: "/eye-rx",
  labOrders: "/lab-orders",
  classes: "/classes",
  subjects: "/subjects",
  attendance: "/attendance",
  assessments: "/assessments",
  studentAccounts: "/student-accounts",
  jobs: "/jobs",
  vehicles: "/vehicles",
  memberships: "/memberships",
  checkins: "/checkins",
  pets: "/pets",
  variants: "/variants",
  serials: "/serials",
  priceTiers: "/price-tiers",
  laundry: "/laundry",
  packages: "/packages",
  labResults: "/lab-results",
  tables: "/tables",
  rooms: "/rooms",
  listings: "/listings",
  shipments: "/shipments",
  projects: "/projects",
  workOrders: "/work-orders",
  matters: "/matters",
  events: "/events",
  plots: "/plots",
};

export function getNicheDef(niche: Niche | string | null | undefined): NicheDefinition {
  if (niche && niche in NICHE_DEFINITIONS) {
    return NICHE_DEFINITIONS[niche as Niche];
  }
  return NICHE_DEFINITIONS.clinic;
}

export function hasCapability(
  niche: Niche | string | null | undefined,
  cap: Capability
): boolean {
  return getNicheDef(niche).capabilities.includes(cap);
}

export function getNavSectionsForNiche(niche: Niche | string | null | undefined): NavSectionDef[] {
  return getNicheDef(niche).navSections;
}

export function nichesInGroup(group: NicheDefinition["group"]): Niche[] {
  return (Object.keys(NICHE_DEFINITIONS) as Niche[]).filter(
    (id) => NICHE_DEFINITIONS[id].group === group
  );
}

/** Flat nav keys for a niche (legacy helpers). */
export function nicheNavKeysList(niche: Niche): string[] {
  return getNavSectionsForNiche(niche).flatMap((s) => s.keys);
}
