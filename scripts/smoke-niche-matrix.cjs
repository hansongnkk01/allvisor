#!/usr/bin/env node
/**
 * Niche capability and dashboard card smoke test.
 *
 * The capability table below is written by hand so a niche change has to be made
 * deliberately in two places. Everything after it is read straight from the real
 * sources, so the dashboard registry, loaders, demo data, translations, sidebar
 * routes and owner guards cannot drift apart without failing here.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

/** @param {string} rel */
function readSource(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/** @param {string} rel */
function sourceExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

/** @param {string} text */
function quotedValues(text) {
  return [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

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

/** @param {string} message */
function fail(message) {
  console.error(`FAIL: ${message}`);
  failed = true;
}

// ---------------------------------------------------------------------------
// Source parsing
// ---------------------------------------------------------------------------

/**
 * Reads NICHE_DEFINITIONS so the table above is checked against the real thing.
 * @returns {Record<string, { capabilities: string[]; navKeys: string[] }>}
 */
function parseNicheDefinitions() {
  const src = readSource("src/lib/niche-capabilities.ts");
  const startIdx = src.indexOf("export const NICHE_DEFINITIONS");
  if (startIdx < 0) throw new Error("NICHE_DEFINITIONS not found");
  const body = src.slice(startIdx);

  const careAdminMatch = src.match(/const CARE_ADMIN: NavSectionDef = \{[\s\S]*?keys: \[([^\]]*)\]/);
  const careAdminKeys = careAdminMatch ? quotedValues(careAdminMatch[1]) : [];

  /** @type {Record<string, { capabilities: string[]; navKeys: string[] }>} */
  const out = {};
  const entryRe = /^ {2}(\w+): \{$([\s\S]*?)^ {2}\},$/gm;
  let match;
  while ((match = entryRe.exec(body))) {
    const [, niche, entry] = match;
    const capMatch = entry.match(/capabilities: \[([\s\S]*?)\]/);
    const navKeys = [...entry.matchAll(/keys: \[([^\]]*)\]/g)].flatMap((m) => quotedValues(m[1]));
    if (entry.includes("CARE_ADMIN")) navKeys.push(...careAdminKeys);
    out[niche] = {
      capabilities: capMatch ? quotedValues(capMatch[1]) : [],
      navKeys,
    };
  }
  return out;
}

/** @returns {Array<{ id: string; audience: string; requires: string[]; span: string; opsBrain: boolean; group: string }>} */
function parseDashboardCards() {
  const src = readSource("src/lib/dashboard-cards.ts");
  const groups = [
    ["admin", /const ADMIN_CARDS: DashboardCardDef\[\] = \[([\s\S]*?)\n\];/],
    ["adminNiche", /const ADMIN_NICHE_CARDS: DashboardCardDef\[\] = \[([\s\S]*?)\n\];/],
    ["staff", /const STAFF_CARDS: DashboardCardDef\[\] = \[([\s\S]*?)\n\];/],
  ];

  /** @type {Array<{ id: string; audience: string; requires: string[]; span: string; opsBrain: boolean; group: string }>} */
  const cards = [];
  for (const [group, re] of groups) {
    const block = src.match(re);
    if (!block) throw new Error(`Card group ${group} not found in dashboard-cards.ts`);
    const lineRe =
      /\{ id: "([^"]+)", audience: "([^"]+)", requires: \[([^\]]*)\], span: "([^"]+)"(, opsBrain: true)? \}/g;
    let card;
    while ((card = lineRe.exec(block[1]))) {
      cards.push({
        id: card[1],
        audience: card[2],
        requires: quotedValues(card[3]),
        span: card[4],
        opsBrain: Boolean(card[5]),
        group,
      });
    }
  }
  return cards;
}

/** @param {string} rel @param {string} declaration */
function parseRecordKeys(rel, declaration) {
  const src = readSource(rel);
  const start = src.indexOf(declaration);
  if (start < 0) throw new Error(`${declaration} not found in ${rel}`);
  const body = src.slice(start + declaration.length);
  return [...body.matchAll(/^ {2}([A-Za-z][A-Za-z0-9]*):/gm)].map((m) => m[1]);
}

function parseNavHref() {
  const src = readSource("src/lib/niche-capabilities.ts");
  const block = src.match(/export const NAV_HREF: Record<string, string> = \{([\s\S]*?)\n\};/);
  if (!block) throw new Error("NAV_HREF not found");
  /** @type {Record<string, string>} */
  const out = {};
  for (const entry of block[1].matchAll(/^ {2}(\w+): "([^"]+)",$/gm)) {
    out[entry[1]] = entry[2];
  }
  return out;
}

const definitions = parseNicheDefinitions();
const cards = parseDashboardCards();
const navHref = parseNavHref();
const ownerNavKeys = quotedValues(
  (readSource("src/lib/niche-capabilities.ts").match(/export const OWNER_NAV_KEYS = \[([^\]]*)\]/) ||
    [])[1] || ""
);

const niches = Object.keys(NICHE_CAPABILITIES);

/** @param {string} niche @param {string} audience */
function cardsFor(niche, audience) {
  return cards.filter(
    (card) =>
      card.audience === audience &&
      !card.opsBrain &&
      card.requires.every((cap) => hasCapability(niche, cap))
  );
}

// ---------------------------------------------------------------------------
// 1. The hand-written table above still matches the real definitions
// ---------------------------------------------------------------------------

for (const niche of niches) {
  const real = definitions[niche];
  if (!real) {
    fail(`niche "${niche}" is in the smoke table but not in NICHE_DEFINITIONS`);
    continue;
  }
  const expected = [...NICHE_CAPABILITIES[niche]].sort().join(",");
  const actual = [...real.capabilities].sort().join(",");
  if (expected !== actual) {
    fail(`capabilities drifted for "${niche}"\n  smoke: ${expected}\n  source: ${actual}`);
  }
}
for (const niche of Object.keys(definitions)) {
  if (!NICHE_CAPABILITIES[niche]) {
    fail(`niche "${niche}" exists in NICHE_DEFINITIONS but not in the smoke table`);
  }
}

// ---------------------------------------------------------------------------
// 2. No card can leak into a niche that has no business showing it
// ---------------------------------------------------------------------------

for (const card of cards) {
  // Universal admin cards and the not-yet-rendered Ops Brain cards are deliberately ungated.
  if (card.group === "admin" || card.opsBrain) continue;
  if (card.requires.length === 0) {
    fail(`card "${card.id}" declares no capability, so it would render for every niche`);
  }
}

const seenCardIds = new Set();
for (const card of cards) {
  if (seenCardIds.has(card.id)) fail(`duplicate card id "${card.id}"`);
  seenCardIds.add(card.id);
}

for (const niche of niches) {
  for (const audience of ["admin", "staff"]) {
    for (const card of cardsFor(niche, audience)) {
      for (const cap of card.requires) {
        if (!hasCapability(niche, cap)) {
          fail(`card "${card.id}" renders for "${niche}" without capability "${cap}"`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Every niche and audience gets a dashboard worth opening
// ---------------------------------------------------------------------------

const MIN_ADMIN_CARDS = 8;

for (const niche of niches) {
  const staffCards = cardsFor(niche, "staff");
  if (staffCards.length < 1) {
    fail(`niche "${niche}" has no staff dashboard cards`);
  }

  const adminCards = cardsFor(niche, "admin");
  if (adminCards.length < MIN_ADMIN_CARDS) {
    fail(
      `niche "${niche}" has ${adminCards.length} admin cards, below the minimum of ${MIN_ADMIN_CARDS}`
    );
  }
  if (!adminCards.some((card) => card.group === "adminNiche")) {
    fail(`niche "${niche}" has no niche-specific admin oversight card`);
  }
}

// ---------------------------------------------------------------------------
// 4. Every declared card has a renderer, a live builder and demo data
// ---------------------------------------------------------------------------

const adminComponents = parseRecordKeys(
  "src/components/dashboards/AdminCards.tsx",
  "export const ADMIN_CARD_COMPONENTS: Record<string, React.FC<AdminCardProps>> = {"
);
const staffLiveBuilders = parseRecordKeys(
  "src/lib/load-niche-cards.ts",
  "const BUILDERS: Record<string, Builder> = {"
);
const staffDemoBuilders = parseRecordKeys(
  "src/lib/demo-niche-cards.ts",
  "const DEMO_CARDS: Record<string, (now: Date) => DemoCard> = {"
);
const adminLiveBuilders = parseRecordKeys(
  "src/lib/load-admin-niche-cards.ts",
  "const BUILDERS: Record<string, Builder> = {"
);
const adminDemoBuilders = parseRecordKeys(
  "src/lib/demo-admin-niche-cards.ts",
  "const DEMO_CARDS: Record<string, () => DemoCard> = {"
);

for (const card of cards) {
  if (card.opsBrain) continue;
  if (card.group === "admin") {
    if (!adminComponents.includes(card.id)) {
      fail(`admin card "${card.id}" has no component in ADMIN_CARD_COMPONENTS`);
    }
    continue;
  }
  const live = card.group === "adminNiche" ? adminLiveBuilders : staffLiveBuilders;
  const demo = card.group === "adminNiche" ? adminDemoBuilders : staffDemoBuilders;
  if (!live.includes(card.id)) fail(`card "${card.id}" has no live data builder`);
  if (!demo.includes(card.id)) fail(`card "${card.id}" has no demo data builder`);
}

// ---------------------------------------------------------------------------
// 5. Both locales can label every card
// ---------------------------------------------------------------------------

for (const locale of ["en", "ms"]) {
  const messages = JSON.parse(readSource(`messages/${locale}.json`));
  const dashCards = messages.DashCards || {};
  for (const card of cards) {
    if (card.opsBrain || card.group === "admin") continue;
    const entry = dashCards[card.id];
    if (!entry || !entry.title || !entry.empty) {
      fail(`messages/${locale}.json is missing DashCards.${card.id} title or empty text`);
    }
  }
}

// ---------------------------------------------------------------------------
// 6. No dead sidebar links
// ---------------------------------------------------------------------------

const navKeys = new Set([
  ...Object.values(definitions).flatMap((def) => def.navKeys),
  ...ownerNavKeys,
]);

for (const key of navKeys) {
  const href = navHref[key];
  if (!href) {
    fail(`nav key "${key}" has no route in NAV_HREF`);
    continue;
  }
  const candidates = [
    `src/app/[locale]/(app)${href}/page.tsx`,
    `src/app/[locale]${href}/page.tsx`,
  ];
  if (!candidates.some(sourceExists)) {
    fail(`nav key "${key}" points at "${href}" but no page exists`);
  }
}

for (const key of ownerNavKeys) {
  for (const niche of niches) {
    if (definitions[niche].navKeys.includes(key)) {
      fail(`owner-only nav key "${key}" is in the staff sidebar for "${niche}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Owner-only routes are guarded on the server
// ---------------------------------------------------------------------------

const GUARDED_ROUTES = [...ownerNavKeys.map((key) => navHref[key]), "/admin-dashboard"];

for (const href of GUARDED_ROUTES) {
  if (!href) continue;
  const rel = `src/app/[locale]/(app)${href}/page.tsx`;
  if (!sourceExists(rel)) {
    fail(`owner route "${href}" has no page to guard`);
    continue;
  }
  const src = readSource(rel);
  if (!src.includes("requireOwner") && !src.includes("canAccessOwnerArea")) {
    fail(`owner route "${href}" is not guarded by requireOwner or canAccessOwnerArea`);
  }
}

const guard = readSource("src/lib/require-owner.ts");
if (!guard.includes("/staff-dashboard")) {
  fail("requireOwner does not redirect rejected users to /staff-dashboard");
}

// ---------------------------------------------------------------------------
// 8. The app-wide gates cannot silently disappear
// ---------------------------------------------------------------------------

const appLayout = readSource("src/app/[locale]/(app)/layout.tsx");
if (!appLayout.includes("requireOrg")) {
  fail("(app)/layout.tsx no longer calls requireOrg — every page would be public");
}
if (!appLayout.includes("VerifyAccountGate")) {
  fail("(app)/layout.tsx no longer mounts VerifyAccountGate — unverified staff would get in");
}

// Manager Zone pages must be locked behind the password gate, not bare roles.
// /admin renders its own inline lock (isAdminUnlocked); the rest share
// SectionLockGate / isSectionUnlocked.
const ZONE_GATE_TOKENS = ["SectionLockGate", "isSectionUnlocked", "isAdminUnlocked"];
for (const href of ["/admin", "/accounting", "/lhdn", "/alerts"]) {
  const rel = `src/app/[locale]/(app)${href}/page.tsx`;
  if (!sourceExists(rel)) {
    fail(`manager-zone route "${href}" has no page`);
    continue;
  }
  const src = readSource(rel);
  if (!ZONE_GATE_TOKENS.some((token) => src.includes(token))) {
    fail(`manager-zone route "${href}" is not behind a password gate`);
  }
}

if (failed) {
  process.exit(1);
}

const adminCardCount = cards.filter((c) => c.audience === "admin").length;
const staffCardCount = cards.filter((c) => c.audience === "staff").length;
console.log(
  `OK niche matrix: ${niches.length} niches, ${adminCardCount} admin cards, ` +
    `${staffCardCount} staff cards, ${navKeys.size} nav keys checked`
);
