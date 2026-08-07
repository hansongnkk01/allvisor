import { cardsFor } from "@/lib/dashboard-cards";
import { formatCurrency } from "@/lib/utils";
import type { Niche } from "@/lib/types";
import type { NicheCardPayload } from "@/lib/dashboard-data";

type DemoCard = Omit<NicheCardPayload, "id">;

function hoursAgo(now: Date, hours: number) {
  return new Date(now.getTime() - hours * 3600000).toISOString();
}

function inDays(now: Date, days: number) {
  return new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);
}

/**
 * One fake card per builder in the live loader, so the homepage demo shows exactly the
 * card set a real shop of that niche would see.
 */
const DEMO_CARDS: Record<string, (now: Date) => DemoCard> = {
  staffCashSession: (now) => ({
    href: "/cash",
    stats: [
      { key: "openedBy", value: "Danial" },
      { key: "openingFloat", value: formatCurrency(200) },
    ],
    rows: [
      { id: "cs1", primary: "Danial", secondary: hoursAgo(now, 5), meta: formatCurrency(200), tone: "good" },
    ],
  }),
  staffPosTickets: () => ({
    href: "/pos",
    stats: [
      { key: "completedToday", value: "47" },
      { key: "heldTickets", value: "2", tone: "warn" },
      { key: "voidToday", value: "1", tone: "warn" },
    ],
    rows: [
      { id: "t1", primary: "PT-0231", secondary: "Farah", meta: "held", tone: "warn" },
      { id: "t2", primary: "PT-0233", secondary: "Danial", meta: "open" },
    ],
  }),
  staffLowStock: () => ({
    href: "/inventory",
    stats: [
      { key: "itemsLow", value: "5", tone: "warn" },
      { key: "itemsOut", value: "1", tone: "danger" },
    ],
    rows: [
      { id: "p1", primary: "Cable 2m", meta: "0 / 10", tone: "danger" },
      { id: "p2", primary: "Adapter USB-C", meta: "3 / 12", tone: "warn" },
      { id: "p3", primary: "Power bank", meta: "4 / 8", tone: "warn" },
    ],
  }),
  staffJobCards: () => ({
    href: "/jobs",
    stats: [
      { key: "jobsOpen", value: "7" },
      { key: "jobsInProgress", value: "3" },
    ],
    rows: [
      { id: "j1", primary: "Service 10,000km", secondary: "WQR 4412", meta: "in_progress" },
      { id: "j2", primary: "Brake pads", secondary: "JHK 2210", meta: "intake" },
    ],
  }),
  staffLaundry: () => ({
    href: "/laundry",
    stats: [
      { key: "ticketsReceived", value: "9" },
      { key: "ticketsInProgress", value: "4" },
      { key: "ticketsReady", value: "6", tone: "good" },
    ],
    rows: [
      { id: "lt1", primary: "LD-1180", secondary: "Nurul", meta: "ready", tone: "good" },
      { id: "lt2", primary: "LD-1181", secondary: "Lim Wei", meta: "ready", tone: "good" },
    ],
  }),
  staffCommissions: () => ({
    href: "/commissions",
    stats: [
      { key: "salesToday", value: formatCurrency(2450) },
      { key: "commissionToday", value: formatCurrency(196) },
    ],
    rows: [
      { id: "c1", primary: "Farah", secondary: "8%", meta: formatCurrency(112) },
      { id: "c2", primary: "Danial", secondary: "8%", meta: formatCurrency(84) },
    ],
  }),
  staffEyeRx: (now) => ({
    href: "/eye-rx",
    stats: [{ key: "recentCount", value: "4" }],
    rows: [
      { id: "rx1", primary: "Aina Rahman", secondary: hoursAgo(now, 3), meta: "62" },
      { id: "rx2", primary: "Lim Wei", secondary: hoursAgo(now, 26), meta: "64" },
    ],
  }),
  staffOpticalLab: () => ({
    href: "/lab-orders",
    stats: [
      { key: "ordersPending", value: "5" },
      { key: "ordersReady", value: "2", tone: "good" },
    ],
    rows: [
      { id: "lo1", primary: "Aina Rahman", secondary: "Titanium round", meta: "ready", tone: "good" },
      { id: "lo2", primary: "Rajesh K.", secondary: "Acetate square", meta: "pending" },
    ],
  }),
  staffBatchExpiry: (now) => ({
    href: "/batches",
    stats: [
      { key: "expiringSoon", value: "4", tone: "warn" },
      { key: "expired", value: "1", tone: "danger" },
    ],
    rows: [
      { id: "b1", primary: "Amoxicillin 250mg", secondary: "LOT-8841", meta: inDays(now, -3), tone: "danger" },
      { id: "b2", primary: "Paracetamol 500mg", secondary: "LOT-9012", meta: inDays(now, 21), tone: "warn" },
    ],
  }),
  staffPetVaccinations: (now) => ({
    href: "/pets",
    stats: [
      { key: "dueSoon", value: "6" },
      { key: "overdue", value: "2", tone: "danger" },
    ],
    rows: [
      { id: "v1", primary: "Bobby", secondary: "Rabies booster", meta: inDays(now, -5), tone: "danger" },
      { id: "v2", primary: "Milo", secondary: "DHPP", meta: inDays(now, 9), tone: "warn" },
    ],
  }),
  staffSessionPackages: () => ({
    href: "/packages",
    stats: [
      { key: "activePackages", value: "18" },
      { key: "almostDone", value: "3", tone: "warn" },
    ],
    rows: [
      { id: "sp1", primary: "Rajesh K.", secondary: "Rehab 10x", meta: "2 / 10", tone: "warn" },
      { id: "sp2", primary: "Nurul Aisyah", secondary: "Sports 8x", meta: "5 / 8" },
    ],
  }),
  staffLabResults: () => ({
    href: "/lab-results",
    stats: [
      { key: "resultsPending", value: "7" },
      { key: "resultsReady", value: "3", tone: "good" },
    ],
    rows: [
      { id: "lr1", primary: "Lim Wei", secondary: "Full blood count", meta: "ready", tone: "good" },
      { id: "lr2", primary: "Aina Rahman", secondary: "Lipid profile", meta: "pending" },
    ],
  }),
  staffClasses: () => ({
    href: "/classes",
    stats: [{ key: "classesTotal", value: "8" }],
    rows: [
      { id: "cl1", primary: "Maths Form 4", secondary: "Mon & Wed 8pm", meta: formatCurrency(180) },
      { id: "cl2", primary: "Science Form 3", secondary: "Tue & Thu 8pm", meta: formatCurrency(160) },
    ],
  }),
  staffAttendance: () => ({
    href: "/attendance",
    stats: [
      { key: "presentToday", value: "34", tone: "good" },
      { key: "absentToday", value: "3", tone: "warn" },
    ],
    rows: [
      { id: "at1", primary: "Haziq", secondary: "Maths Form 4", tone: "warn" },
      { id: "at2", primary: "Chong", secondary: "Science Form 3", tone: "warn" },
    ],
  }),
  staffGrading: (now) => ({
    href: "/assessments",
    stats: [{ key: "awaitingGrading", value: "12", tone: "warn" }],
    rows: [
      { id: "g1", primary: "Haziq", secondary: "Algebra quiz 2", meta: hoursAgo(now, 20) },
      { id: "g2", primary: "Nur Ain", secondary: "Algebra quiz 2", meta: hoursAgo(now, 22) },
    ],
  }),
  staffMemberships: (now) => ({
    href: "/memberships",
    stats: [
      { key: "activeMembers", value: "186" },
      { key: "expiringMembers", value: "9", tone: "warn" },
    ],
    rows: [
      { id: "m1", primary: "Rajesh K.", secondary: "Annual", meta: inDays(now, 6), tone: "warn" },
      { id: "m2", primary: "Mei Ling", secondary: "Monthly", meta: inDays(now, 12), tone: "warn" },
    ],
  }),
  staffCheckins: (now) => ({
    href: "/checkins",
    stats: [{ key: "checkinsToday", value: "58" }],
    rows: [
      { id: "ci1", primary: "Rajesh K.", meta: hoursAgo(now, 1) },
      { id: "ci2", primary: "Mei Ling", meta: hoursAgo(now, 2) },
    ],
  }),
  staffTables: () => ({
    href: "/tables",
    stats: [
      { key: "tablesFree", value: "6", tone: "good" },
      { key: "tablesOccupied", value: "8", tone: "warn" },
    ],
    rows: [
      { id: "tb1", primary: "T04", secondary: "4", meta: "occupied", tone: "warn" },
      { id: "tb2", primary: "T07", secondary: "2", meta: "occupied", tone: "warn" },
    ],
  }),
  staffRooms: () => ({
    href: "/rooms",
    stats: [
      { key: "roomsVacant", value: "5", tone: "good" },
      { key: "roomsOccupied", value: "14" },
      { key: "roomsCleaning", value: "3", tone: "warn" },
    ],
    rows: [
      { id: "r1", primary: "203", secondary: "deluxe", meta: "occupied" },
      { id: "r2", primary: "305", secondary: "standard", meta: "cleaning" },
    ],
  }),
  staffListings: () => ({
    href: "/listings",
    stats: [
      { key: "listingsActive", value: "12" },
      { key: "listingsReserved", value: "3" },
      { key: "listingsSold", value: "2", tone: "good" },
    ],
    rows: [
      { id: "li1", primary: "Taman Sari 2-storey", meta: "available" },
      { id: "li2", primary: "Seri Jaya condo A-12-3", meta: "available" },
    ],
  }),
  staffShipments: () => ({
    href: "/shipments",
    stats: [
      { key: "shipmentsOpen", value: "23" },
      { key: "shipmentsInTransit", value: "15" },
    ],
    rows: [
      { id: "sh1", primary: "AV-778120", meta: "in_transit" },
      { id: "sh2", primary: "AV-778121", meta: "created" },
    ],
  }),
  staffProjects: () => ({
    href: "/projects",
    stats: [
      { key: "activeProjects", value: "4" },
      { key: "claimsValue", value: formatCurrency(86500) },
    ],
    rows: [
      { id: "pr1", primary: "Surau renovation", secondary: "active", meta: formatCurrency(42000) },
      { id: "pr2", primary: "Shoplot wiring", secondary: "active", meta: formatCurrency(18500) },
    ],
  }),
  staffWorkOrders: () => ({
    href: "/work-orders",
    stats: [
      { key: "ordersPlanned", value: "6" },
      { key: "ordersInProgress", value: "4" },
    ],
    rows: [
      { id: "wo1", primary: "Batch 220 - frames", meta: "in_progress" },
      { id: "wo2", primary: "Batch 221 - panels", meta: "planned" },
    ],
  }),
  staffMatters: () => ({
    href: "/matters",
    stats: [{ key: "openMatters", value: "11" }],
    rows: [
      { id: "mt1", primary: "Tan v. Prima Sdn Bhd", meta: "open" },
      { id: "mt2", primary: "Estate of Ahmad", meta: "open" },
    ],
  }),
  staffEvents: (now) => ({
    href: "/events",
    stats: [
      { key: "upcomingEvents", value: "5" },
      { key: "thisWeek", value: "2", tone: "warn" },
    ],
    rows: [
      { id: "ev1", primary: "Wedding - Aisyah & Faiz", secondary: inDays(now, 4), meta: "planning" },
      { id: "ev2", primary: "Corporate dinner - Prima", secondary: inDays(now, 6), meta: "confirmed" },
    ],
  }),
  staffPlots: () => ({
    href: "/plots",
    stats: [
      { key: "plotsPlanted", value: "7", tone: "good" },
      { key: "plotsIdle", value: "2" },
    ],
    rows: [
      { id: "pl1", primary: "Plot A", secondary: "Chilli", meta: "planted" },
      { id: "pl2", primary: "Plot C", secondary: null, meta: "idle" },
    ],
  }),
};

export function buildDemoNicheCards(niche: Niche, now: Date): NicheCardPayload[] {
  return cardsFor(niche, "staff")
    .filter((card) => DEMO_CARDS[card.id])
    .map((card) => ({ id: card.id, ...DEMO_CARDS[card.id](now) }));
}

/** Card ids the demo can fill. Used by the coverage test. */
export const DEMO_NICHE_CARD_IDS = Object.keys(DEMO_CARDS);
