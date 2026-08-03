#!/usr/bin/env node
/**
 * Self-contained niche capability smoke test.
 * Expectations mirror src/lib/niche-capabilities.ts — update both when changing niches.
 */

/** @type {Record<string, readonly string[]>} */
const NICHE_CAPABILITIES = {
  clinic: [
    "dashboard", "customers", "appointments", "allergies", "clinic_hours",
    "invoices", "inventory", "admin", "accounting", "lhdn",
  ],
  retail: [
    "dashboard", "customers", "pos", "cash_drawer", "receipts", "inventory",
    "product_categories", "logistics", "printers", "invoices", "admin",
    "accounting", "lhdn",
  ],
  salon: [
    "dashboard", "customers", "appointments", "service_duration", "commissions",
    "pos", "inventory", "product_categories", "invoices", "receipts", "admin",
    "accounting", "lhdn",
  ],
  pharmacy: [
    "dashboard", "customers", "pos", "cash_drawer", "receipts", "inventory",
    "product_categories", "batch_expiry", "rx_attach", "logistics", "printers",
    "invoices", "admin", "accounting", "lhdn",
  ],
  optical: [
    "dashboard", "customers", "appointments", "eye_rx", "lab_orders", "pos",
    "inventory", "product_categories", "invoices", "receipts", "admin",
    "accounting", "lhdn",
  ],
  tuition: [
    "dashboard", "customers", "class_schedule", "attendance", "term_fees",
    "assessments", "invoices", "admin", "accounting", "lhdn",
  ],
  workshop: [
    "dashboard", "customers", "job_cards", "vehicle_profile", "pos", "inventory",
    "product_categories", "invoices", "receipts", "admin", "accounting", "lhdn",
  ],
  gym: [
    "dashboard", "customers", "memberships", "class_checkin", "pt_sessions",
    "class_schedule", "invoices", "admin", "accounting", "lhdn",
  ],
  vet: [
    "dashboard", "customers", "pet_profiles", "pet_vaccinations", "appointments",
    "allergies", "inventory", "invoices", "admin", "accounting", "lhdn",
  ],
  fashion: [
    "dashboard", "customers", "pos", "cash_drawer", "receipts", "inventory",
    "product_categories", "variants", "logistics", "printers", "invoices", "admin",
    "accounting", "lhdn",
  ],
  electronics: [
    "dashboard", "customers", "pos", "cash_drawer", "receipts", "inventory",
    "product_categories", "serial_numbers", "logistics", "printers", "invoices",
    "admin", "accounting", "lhdn",
  ],
  wholesale: [
    "dashboard", "customers", "pos", "cash_drawer", "receipts", "inventory",
    "product_categories", "price_tiers", "logistics", "printers", "invoices",
    "admin", "accounting", "lhdn",
  ],
  laundry: [
    "dashboard", "customers", "laundry_tickets", "pos", "inventory", "invoices",
    "receipts", "admin", "accounting", "lhdn",
  ],
  physio: [
    "dashboard", "customers", "appointments", "session_packages", "allergies",
    "invoices", "inventory", "admin", "accounting", "lhdn",
  ],
  lab: [
    "dashboard", "customers", "appointments", "lab_results", "invoices", "admin",
    "accounting", "lhdn",
  ],
  fnb: [
    "dashboard", "customers", "tables_kot", "pos", "inventory", "product_categories",
    "cash_drawer", "receipts", "invoices", "admin", "accounting", "lhdn",
  ],
  hotel: [
    "dashboard", "customers", "rooms", "invoices", "admin", "accounting", "lhdn",
  ],
  property: ["dashboard", "customers", "property_listings", "invoices", "admin", "accounting", "lhdn"],
  courier: ["dashboard", "customers", "courier_tracking", "invoices", "admin", "accounting", "lhdn"],
  contractor: ["dashboard", "customers", "project_claims", "invoices", "admin", "accounting", "lhdn"],
  manufacturing: ["dashboard", "customers", "bom_wip", "inventory", "invoices", "admin", "accounting", "lhdn"],
  legal: ["dashboard", "customers", "matter_billing", "invoices", "admin", "accounting", "lhdn"],
  events: ["dashboard", "customers", "event_timeline", "invoices", "admin", "accounting", "lhdn"],
  farm: ["dashboard", "customers", "farm_plots", "inventory", "invoices", "admin", "accounting", "lhdn"],
};

/** @param {string | null | undefined} niche @param {string} cap */
function hasCapability(niche, cap) {
  const caps = NICHE_CAPABILITIES[niche ?? "clinic"] ?? NICHE_CAPABILITIES.clinic;
  return caps.includes(cap);
}

/** @type {Array<{ niche: string; mustHave: string[]; mustNotHave: string[] }>} */
const SMOKE_ASSERTIONS = [
  {
    niche: "clinic",
    mustHave: ["appointments", "allergies"],
    mustNotHave: ["pos", "cash_drawer", "logistics"],
  },
  {
    niche: "retail",
    mustHave: ["pos", "cash_drawer"],
    mustNotHave: ["appointments", "allergies"],
  },
  {
    niche: "salon",
    mustHave: ["appointments", "pos", "commissions"],
    mustNotHave: ["batch_expiry", "job_cards"],
  },
  {
    niche: "pharmacy",
    mustHave: ["batch_expiry", "pos"],
    mustNotHave: ["appointments", "commissions"],
  },
  {
    niche: "optical",
    mustHave: ["appointments", "eye_rx", "pos"],
    mustNotHave: ["commissions", "job_cards"],
  },
  {
    niche: "tuition",
    mustHave: ["class_schedule", "attendance", "term_fees", "assessments"],
    mustNotHave: ["pos", "appointments"],
  },
  {
    niche: "workshop",
    mustHave: ["job_cards", "vehicle_profile", "pos"],
    mustNotHave: ["appointments", "commissions"],
  },
  {
    niche: "gym",
    mustHave: ["memberships", "class_checkin", "pt_sessions"],
    mustNotHave: ["pos", "appointments"],
  },
  {
    niche: "vet",
    mustHave: ["pet_profiles", "pet_vaccinations", "appointments", "allergies"],
    mustNotHave: ["pos", "commissions"],
  },
  {
    niche: "fashion",
    mustHave: ["pos", "cash_drawer", "variants"],
    mustNotHave: ["appointments", "batch_expiry"],
  },
  {
    niche: "electronics",
    mustHave: ["pos", "serial_numbers"],
    mustNotHave: ["appointments", "variants"],
  },
  {
    niche: "wholesale",
    mustHave: ["pos", "price_tiers"],
    mustNotHave: ["appointments", "serial_numbers"],
  },
  {
    niche: "laundry",
    mustHave: ["laundry_tickets", "pos"],
    mustNotHave: ["appointments", "batch_expiry"],
  },
  {
    niche: "physio",
    mustHave: ["appointments", "session_packages", "allergies"],
    mustNotHave: ["pos", "commissions"],
  },
  {
    niche: "lab",
    mustHave: ["appointments", "lab_results"],
    mustNotHave: ["pos", "allergies"],
  },
  {
    niche: "fnb",
    mustHave: ["tables_kot", "pos", "cash_drawer"],
    mustNotHave: ["appointments", "rooms"],
  },
  {
    niche: "hotel",
    mustHave: ["rooms"],
    mustNotHave: ["pos", "appointments", "tables_kot"],
  },
  {
    niche: "property",
    mustHave: ["property_listings"],
    mustNotHave: ["pos", "appointments"],
  },
  {
    niche: "courier",
    mustHave: ["courier_tracking"],
    mustNotHave: ["pos", "rooms"],
  },
  {
    niche: "contractor",
    mustHave: ["project_claims"],
    mustNotHave: ["pos", "appointments"],
  },
  {
    niche: "manufacturing",
    mustHave: ["bom_wip", "inventory"],
    mustNotHave: ["appointments", "pos"],
  },
  {
    niche: "legal",
    mustHave: ["matter_billing"],
    mustNotHave: ["pos", "appointments"],
  },
  {
    niche: "events",
    mustHave: ["event_timeline"],
    mustNotHave: ["pos", "rooms"],
  },
  {
    niche: "farm",
    mustHave: ["farm_plots", "inventory"],
    mustNotHave: ["pos", "appointments"],
  },
];

let failed = false;

for (const { niche, mustHave, mustNotHave } of SMOKE_ASSERTIONS) {
  for (const cap of mustHave) {
    if (!hasCapability(niche, cap)) {
      console.error(`FAIL: ${niche} must have "${cap}"`);
      failed = true;
    }
  }
  for (const cap of mustNotHave) {
    if (hasCapability(niche, cap)) {
      console.error(`FAIL: ${niche} must NOT have "${cap}"`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log("OK niche capability matrix (" + SMOKE_ASSERTIONS.length + " niches checked)");
