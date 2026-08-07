import { cardsFor } from "@/lib/dashboard-cards";
import { formatCurrency } from "@/lib/utils";
import type { Niche } from "@/lib/types";
import type { NicheCardPayload } from "@/lib/dashboard-data";

type DemoCard = Omit<NicheCardPayload, "id">;

/** Owner-side demo cards, one per admin niche builder, so the demo mirrors a real shop. */
const DEMO_CARDS: Record<string, () => DemoCard> = {
  adminStaffSales: () => ({
    href: "/pos",
    stats: [
      { key: "weekSales", value: formatCurrency(16820) },
      { key: "sellers", value: "4" },
    ],
    rows: [
      { id: "s1", primary: "Farah", secondary: "128", meta: formatCurrency(6420), tone: "good" },
      { id: "s2", primary: "Danial", secondary: "104", meta: formatCurrency(5210) },
      { id: "s3", primary: "Siti", secondary: "86", meta: formatCurrency(3190) },
    ],
  }),
  adminVoidWatch: () => ({
    href: "/receipts",
    stats: [
      { key: "voidsWeek", value: "9", tone: "warn" },
      { key: "voidRate", value: "3%" },
    ],
    rows: [
      { id: "v1", primary: "Danial", meta: "6", tone: "warn" },
      { id: "v2", primary: "Farah", meta: "3", tone: "warn" },
    ],
  }),
  adminCashVariance: () => ({
    href: "/cash",
    stats: [
      { key: "sessionsClosed", value: "26" },
      { key: "totalVariance", value: formatCurrency(-38.5), tone: "warn" },
    ],
    rows: [
      { id: "cv1", primary: "Danial", secondary: "3 Aug", meta: formatCurrency(-25), tone: "danger" },
      { id: "cv2", primary: "Siti", secondary: "29 Jul", meta: formatCurrency(-13.5), tone: "warn" },
    ],
  }),
  adminApptUtilisation: () => ({
    href: "/appointments",
    stats: [
      { key: "bookedMonth", value: "246" },
      { key: "noShowRate", value: "7%" },
      { key: "cancelRate", value: "4%" },
    ],
    rows: [
      { id: "a1", primary: "completed", meta: "218" },
      { id: "a2", primary: "no_show", meta: "18" },
      { id: "a3", primary: "cancelled", meta: "10" },
    ],
  }),
  adminStockValue: () => ({
    href: "/inventory",
    stats: [
      { key: "stockAtCost", value: formatCurrency(48200) },
      { key: "stockAtRetail", value: formatCurrency(72400) },
      { key: "skuCount", value: "312" },
    ],
    rows: [
      { id: "sv1", primary: "Power bank 20k", meta: formatCurrency(6200) },
      { id: "sv2", primary: "Adapter USB-C", meta: formatCurrency(4100) },
    ],
  }),
  adminDeadStock: () => ({
    href: "/inventory",
    stats: [
      { key: "deadSkus", value: "23", tone: "warn" },
      { key: "deadValue", value: formatCurrency(5140), tone: "warn" },
    ],
    rows: [
      { id: "ds1", primary: "Mouse pad XL", meta: formatCurrency(980), tone: "warn" },
      { id: "ds2", primary: "Tape pack", meta: formatCurrency(720), tone: "warn" },
    ],
  }),
  adminCommissionPayout: () => ({
    href: "/commissions",
    stats: [
      { key: "payoutMonth", value: formatCurrency(3860) },
      { key: "sellers", value: "4" },
    ],
    rows: [
      { id: "cp1", primary: "Farah", secondary: formatCurrency(24200), meta: formatCurrency(1936) },
      { id: "cp2", primary: "Danial", secondary: formatCurrency(18100), meta: formatCurrency(1448) },
    ],
  }),
  adminBatchRisk: () => ({
    href: "/batches",
    stats: [
      { key: "atRiskValue", value: formatCurrency(2180), tone: "warn" },
      { key: "expired", value: "1", tone: "danger" },
    ],
    rows: [
      { id: "br1", primary: "Amoxicillin 250mg", secondary: "LOT-8841", meta: formatCurrency(860), tone: "danger" },
      { id: "br2", primary: "Cough syrup", secondary: "LOT-9110", meta: formatCurrency(520), tone: "warn" },
    ],
  }),
  adminLabTurnaround: () => ({
    href: "/lab-orders",
    stats: [
      { key: "openOrders", value: "7" },
      { key: "averageAgeDays", value: "5" },
    ],
    rows: [
      { id: "lt1", primary: "Rajesh K.", secondary: "pending", meta: "9d", tone: "warn" },
      { id: "lt2", primary: "Aina Rahman", secondary: "ready", meta: "3d" },
    ],
  }),
  adminJobThroughput: () => ({
    href: "/jobs",
    stats: [
      { key: "jobsMonth", value: "38" },
      { key: "averageJobValue", value: formatCurrency(420) },
      { key: "labourVsParts", value: `${formatCurrency(7100)} / ${formatCurrency(8860)}` },
    ],
    rows: [
      { id: "jt1", primary: "collected", meta: "24" },
      { id: "jt2", primary: "in_progress", meta: "9" },
      { id: "jt3", primary: "intake", meta: "5" },
    ],
  }),
  adminLaundryAgeing: () => ({
    href: "/laundry",
    stats: [
      { key: "uncollected", value: "19" },
      { key: "olderThanWeek", value: "4", tone: "warn" },
    ],
    rows: [
      { id: "la1", primary: "LD-1104", secondary: "Chong", meta: "14d", tone: "warn" },
      { id: "la2", primary: "LD-1121", secondary: "Nurul", meta: "9d", tone: "warn" },
    ],
  }),
  adminClassFill: () => ({
    href: "/classes",
    stats: [
      { key: "classesTotal", value: "8" },
      { key: "enrolled", value: "126" },
      { key: "emptyClasses", value: "1", tone: "warn" },
    ],
    rows: [
      { id: "cf1", primary: "Maths Form 4", secondary: formatCurrency(180), meta: "24" },
      { id: "cf2", primary: "Science Form 3", secondary: formatCurrency(160), meta: "21" },
    ],
  }),
  adminAttendanceRate: () => ({
    href: "/attendance",
    stats: [
      { key: "marked", value: "742" },
      { key: "attendanceRate", value: "91%", tone: "good" },
    ],
    rows: [],
  }),
  adminTeacherPayroll: () => ({
    href: "/subjects",
    stats: [
      { key: "subjects", value: "6" },
      { key: "teacherPayroll", value: formatCurrency(9800) },
    ],
    rows: [
      { id: "tp1", primary: "Cikgu Rahim", secondary: "Maths", meta: formatCurrency(2400) },
      { id: "tp2", primary: "Cikgu Lina", secondary: "Science", meta: formatCurrency(2200) },
    ],
  }),
  adminMembershipChurn: () => ({
    href: "/memberships",
    stats: [
      { key: "activeMembers", value: "186" },
      { key: "lapsed", value: "11", tone: "danger" },
      { key: "churnRate", value: "6%" },
    ],
    rows: [
      { id: "mc1", primary: "Annual", meta: "94" },
      { id: "mc2", primary: "Monthly", meta: "76" },
    ],
  }),
  adminCheckinTrend: () => ({
    href: "/checkins",
    stats: [
      { key: "checkinsMonth", value: "1420" },
      { key: "checkinsWeek", value: "352" },
      { key: "dailyAverage", value: "47" },
    ],
    rows: [],
  }),
  adminVaccinationCompliance: () => ({
    href: "/pets",
    stats: [
      { key: "trackedVaccinations", value: "214" },
      { key: "overdue", value: "12", tone: "danger" },
      { key: "complianceRate", value: "94%" },
    ],
    rows: [
      { id: "vc1", primary: "Bobby", secondary: "Rabies booster", meta: "2026-07-20", tone: "danger" },
      { id: "vc2", primary: "Coco", secondary: "DHPP", meta: "2026-07-28", tone: "danger" },
    ],
  }),
  adminPackageUtilisation: () => ({
    href: "/packages",
    stats: [
      { key: "packagesSold", value: "64" },
      { key: "utilisation", value: "68%" },
      { key: "sessionsOwed", value: "182", tone: "warn" },
    ],
    rows: [
      { id: "pu1", primary: "Rehab 10x", secondary: "72%", meta: "216 / 300" },
      { id: "pu2", primary: "Sports 8x", secondary: "61%", meta: "98 / 160" },
    ],
  }),
  adminLabTests: () => ({
    href: "/lab-results",
    stats: [
      { key: "testsMonth", value: "182" },
      { key: "resultsPending", value: "14" },
      { key: "released", value: "168", tone: "good" },
    ],
    rows: [
      { id: "lt1", primary: "Full blood count", meta: "62" },
      { id: "lt2", primary: "Lipid profile", meta: "41" },
    ],
  }),
  adminVariantSellThrough: () => ({
    href: "/variants",
    stats: [
      { key: "variantsTracked", value: "486" },
      { key: "soldOut", value: "37", tone: "warn" },
      { key: "sellThrough", value: "8%" },
    ],
    rows: [
      { id: "vs1", primary: "Linen shirt", secondary: "M / White", meta: "0", tone: "warn" },
      { id: "vs2", primary: "Chino pants", secondary: "32 / Khaki", meta: "0", tone: "warn" },
    ],
  }),
  adminSerialExposure: () => ({
    href: "/serials",
    stats: [
      { key: "serialsTracked", value: "268" },
      { key: "inStock", value: "94" },
      { key: "serialStockValue", value: formatCurrency(126400) },
    ],
    rows: [
      { id: "se1", primary: "in_stock", meta: "94" },
      { id: "se2", primary: "sold", meta: "168" },
      { id: "se3", primary: "rma", meta: "6" },
    ],
  }),
  adminPriceTierMix: () => ({
    href: "/price-tiers",
    stats: [
      { key: "tiers", value: "4" },
      { key: "deepestDiscount", value: "22%", tone: "warn" },
    ],
    rows: [
      { id: "pt1", primary: "Distributor", meta: "22%", tone: "warn" },
      { id: "pt2", primary: "Wholesale", meta: "15%" },
    ],
  }),
  adminTableTurnover: () => ({
    href: "/tables",
    stats: [
      { key: "tablesTotal", value: "14" },
      { key: "seatsTotal", value: "56" },
      { key: "occupancy", value: "57%" },
    ],
    rows: [
      { id: "tt1", primary: "occupied", meta: "8" },
      { id: "tt2", primary: "free", meta: "6" },
    ],
  }),
  adminOccupancy: () => ({
    href: "/rooms",
    stats: [
      { key: "occupancy", value: "74%" },
      { key: "averageRate", value: formatCurrency(180) },
      { key: "revpar", value: formatCurrency(133) },
    ],
    rows: [
      { id: "oc1", primary: "occupied", meta: "14" },
      { id: "oc2", primary: "vacant", meta: "5" },
    ],
  }),
  adminListingPipeline: () => ({
    href: "/listings",
    stats: [
      { key: "listingsTotal", value: "17" },
      { key: "daysOnMarket", value: "62" },
    ],
    rows: [
      { id: "lp1", primary: "available", meta: "12" },
      { id: "lp2", primary: "reserved", meta: "3" },
      { id: "lp3", primary: "sold", meta: "2" },
    ],
  }),
  adminShipmentService: () => ({
    href: "/shipments",
    stats: [
      { key: "shipmentsMonth", value: "482" },
      { key: "deliveredRate", value: "95%", tone: "good" },
      { key: "stuck", value: "6", tone: "warn" },
    ],
    rows: [
      { id: "ss1", primary: "AV-771002", secondary: "in_transit", meta: "5d", tone: "warn" },
      { id: "ss2", primary: "AV-771044", secondary: "created", meta: "4d", tone: "warn" },
    ],
  }),
  adminProjectClaims: () => ({
    href: "/projects",
    stats: [
      { key: "activeProjects", value: "4" },
      { key: "claimsOutstanding", value: formatCurrency(86500) },
    ],
    rows: [
      { id: "pc1", primary: "Surau renovation", secondary: "active", meta: "112d" },
      { id: "pc2", primary: "Shoplot wiring", secondary: "active", meta: "48d" },
    ],
  }),
  adminWipAgeing: () => ({
    href: "/work-orders",
    stats: [
      { key: "ordersOpen", value: "10" },
      { key: "olderThanTwoWeeks", value: "3", tone: "warn" },
    ],
    rows: [
      { id: "wa1", primary: "Batch 214 - frames", secondary: "in_progress", meta: "21d", tone: "warn" },
      { id: "wa2", primary: "Batch 220 - panels", secondary: "in_progress", meta: "9d" },
    ],
  }),
  adminMatterStatus: () => ({
    href: "/matters",
    stats: [
      { key: "openMatters", value: "11" },
      { key: "olderThanQuarter", value: "4", tone: "warn" },
    ],
    rows: [
      { id: "ms1", primary: "open", meta: "11" },
      { id: "ms2", primary: "closed", meta: "27" },
    ],
  }),
  adminEventPipeline: () => ({
    href: "/events",
    stats: [
      { key: "upcomingEvents", value: "5" },
      { key: "confirmed", value: "3", tone: "good" },
      { key: "planning", value: "2" },
    ],
    rows: [
      { id: "ep1", primary: "2026-08", meta: "3" },
      { id: "ep2", primary: "2026-09", meta: "2" },
    ],
  }),
  adminPlotStatus: () => ({
    href: "/plots",
    stats: [
      { key: "plotsTotal", value: "9" },
      { key: "plotsPlanted", value: "7", tone: "good" },
      { key: "plotsIdle", value: "2" },
    ],
    rows: [
      { id: "ps1", primary: "Chilli", meta: "4" },
      { id: "ps2", primary: "Okra", meta: "3" },
    ],
  }),
};

export function buildDemoAdminNicheCards(niche: Niche): NicheCardPayload[] {
  return cardsFor(niche, "admin")
    .filter((card) => DEMO_CARDS[card.id])
    .map((card) => ({ id: card.id, ...DEMO_CARDS[card.id]() }));
}

/** Card ids the admin demo can fill. Used by the coverage test. */
export const DEMO_ADMIN_NICHE_CARD_IDS = Object.keys(DEMO_CARDS);
