import { hasCapability, type Capability } from "@/lib/niche-capabilities";
import type { Audience, Niche } from "@/lib/types";

/**
 * Every dashboard card declares which niche capabilities it needs. The niche then
 * decides what renders, which is what stops a tuition centre from being shown a cash
 * drawer and keeps 24 niches times 2 audiences from being hand-written.
 */

export type CardSpan = "full" | "half";

export type DashboardCardDef = {
  id: string;
  audience: Audience;
  /** The niche must have every listed capability. Empty means universal. */
  requires: readonly Capability[];
  span: CardSpan;
  /** Renders only when the org has the Ops Brain switched on (ops_brain_enabled). */
  opsBrain?: boolean;
};

const ADMIN_CARDS: DashboardCardDef[] = [
  { id: "adminHeadline", audience: "admin", requires: [], span: "full" },
  // Ops Brain rows sit right under the headline: briefing full width, then the
  // alerts inbox paired with the staff ranking.
  { id: "adminAiBriefing", audience: "admin", requires: [], span: "full", opsBrain: true },
  { id: "adminAlertsInbox", audience: "admin", requires: [], span: "half", opsBrain: true },
  { id: "adminStaffRanking", audience: "admin", requires: [], span: "half", opsBrain: true },
  { id: "adminRevenueTrend", audience: "admin", requires: [], span: "full" },
  { id: "adminMonthPnl", audience: "admin", requires: [], span: "half" },
  { id: "adminReceivables", audience: "admin", requires: [], span: "half" },
  { id: "adminNicheGrid", audience: "admin", requires: [], span: "full" },
  { id: "adminStaffActivity", audience: "admin", requires: [], span: "full" },
  { id: "adminTasks", audience: "admin", requires: [], span: "half", opsBrain: true },
  { id: "adminTeamBranches", audience: "admin", requires: [], span: "half" },
  { id: "adminLhdn", audience: "admin", requires: ["lhdn"], span: "half" },
  { id: "adminMarketing", audience: "admin", requires: [], span: "full" },
];

/**
 * Oversight that only makes sense for a given business model. These render inside the
 * adminNicheGrid slot, using the same generic card renderer as the staff cards.
 */
const ADMIN_NICHE_CARDS: DashboardCardDef[] = [
  { id: "adminStaffSales", audience: "admin", requires: ["pos"], span: "half" },
  { id: "adminVoidWatch", audience: "admin", requires: ["pos"], span: "half" },
  { id: "adminCashVariance", audience: "admin", requires: ["cash_drawer"], span: "half" },
  { id: "adminApptUtilisation", audience: "admin", requires: ["appointments"], span: "half" },
  { id: "adminStockValue", audience: "admin", requires: ["inventory"], span: "half" },
  { id: "adminDeadStock", audience: "admin", requires: ["inventory"], span: "half" },

  { id: "adminCommissionPayout", audience: "admin", requires: ["commissions"], span: "half" },
  { id: "adminBatchRisk", audience: "admin", requires: ["batch_expiry"], span: "half" },
  { id: "adminLabTurnaround", audience: "admin", requires: ["lab_orders"], span: "half" },
  { id: "adminJobThroughput", audience: "admin", requires: ["job_cards"], span: "half" },
  { id: "adminLaundryAgeing", audience: "admin", requires: ["laundry_tickets"], span: "half" },

  { id: "adminClassFill", audience: "admin", requires: ["class_schedule"], span: "half" },
  { id: "adminAttendanceRate", audience: "admin", requires: ["attendance"], span: "half" },
  { id: "adminTeacherPayroll", audience: "admin", requires: ["term_fees"], span: "half" },
  { id: "adminMembershipChurn", audience: "admin", requires: ["memberships"], span: "half" },
  { id: "adminCheckinTrend", audience: "admin", requires: ["class_checkin"], span: "half" },

  { id: "adminVaccinationCompliance", audience: "admin", requires: ["pet_vaccinations"], span: "half" },
  { id: "adminPackageUtilisation", audience: "admin", requires: ["session_packages"], span: "half" },
  { id: "adminLabTests", audience: "admin", requires: ["lab_results"], span: "half" },
  { id: "adminVariantSellThrough", audience: "admin", requires: ["variants"], span: "half" },
  { id: "adminSerialExposure", audience: "admin", requires: ["serial_numbers"], span: "half" },
  { id: "adminPriceTierMix", audience: "admin", requires: ["price_tiers"], span: "half" },

  { id: "adminTableTurnover", audience: "admin", requires: ["tables_kot"], span: "half" },
  { id: "adminOccupancy", audience: "admin", requires: ["rooms"], span: "half" },
  { id: "adminListingPipeline", audience: "admin", requires: ["property_listings"], span: "half" },
  { id: "adminShipmentService", audience: "admin", requires: ["courier_tracking"], span: "half" },
  { id: "adminProjectClaims", audience: "admin", requires: ["project_claims"], span: "half" },
  { id: "adminWipAgeing", audience: "admin", requires: ["bom_wip"], span: "half" },
  { id: "adminMatterStatus", audience: "admin", requires: ["matter_billing"], span: "half" },
  { id: "adminEventPipeline", audience: "admin", requires: ["event_timeline"], span: "half" },
  { id: "adminPlotStatus", audience: "admin", requires: ["farm_plots"], span: "half" },
];

/**
 * Order here is the order on screen. Counter work first, then stock, then the
 * specialist work each trade actually does during the day.
 */
const STAFF_CARDS: DashboardCardDef[] = [
  { id: "staffCashSession", audience: "staff", requires: ["cash_drawer"], span: "half" },
  { id: "staffPosTickets", audience: "staff", requires: ["pos"], span: "half" },

  { id: "staffTables", audience: "staff", requires: ["tables_kot"], span: "half" },
  { id: "staffRooms", audience: "staff", requires: ["rooms"], span: "half" },

  { id: "staffClasses", audience: "staff", requires: ["class_schedule"], span: "half" },
  { id: "staffAttendance", audience: "staff", requires: ["attendance"], span: "half" },
  { id: "staffGrading", audience: "staff", requires: ["assessments"], span: "half" },
  { id: "staffMemberships", audience: "staff", requires: ["memberships"], span: "half" },
  { id: "staffCheckins", audience: "staff", requires: ["class_checkin"], span: "half" },

  { id: "staffJobCards", audience: "staff", requires: ["job_cards"], span: "half" },
  { id: "staffLaundry", audience: "staff", requires: ["laundry_tickets"], span: "half" },
  { id: "staffCommissions", audience: "staff", requires: ["commissions"], span: "half" },

  { id: "staffEyeRx", audience: "staff", requires: ["eye_rx"], span: "half" },
  { id: "staffOpticalLab", audience: "staff", requires: ["lab_orders"], span: "half" },
  { id: "staffBatchExpiry", audience: "staff", requires: ["batch_expiry"], span: "half" },
  { id: "staffPetVaccinations", audience: "staff", requires: ["pet_vaccinations"], span: "half" },
  { id: "staffSessionPackages", audience: "staff", requires: ["session_packages"], span: "half" },
  { id: "staffLabResults", audience: "staff", requires: ["lab_results"], span: "half" },

  { id: "staffListings", audience: "staff", requires: ["property_listings"], span: "half" },
  { id: "staffShipments", audience: "staff", requires: ["courier_tracking"], span: "half" },
  { id: "staffProjects", audience: "staff", requires: ["project_claims"], span: "half" },
  { id: "staffWorkOrders", audience: "staff", requires: ["bom_wip"], span: "half" },
  { id: "staffMatters", audience: "staff", requires: ["matter_billing"], span: "half" },
  { id: "staffEvents", audience: "staff", requires: ["event_timeline"], span: "half" },
  { id: "staffPlots", audience: "staff", requires: ["farm_plots"], span: "half" },

  { id: "staffLowStock", audience: "staff", requires: ["inventory"], span: "half" },

  { id: "staffMyTasks", audience: "staff", requires: [], span: "half", opsBrain: true },
];

export const DASHBOARD_CARDS: readonly DashboardCardDef[] = [
  ...ADMIN_CARDS,
  ...ADMIN_NICHE_CARDS,
  ...STAFF_CARDS,
];

/** Ids rendered inside the adminNicheGrid slot rather than as standalone components. */
export const ADMIN_NICHE_CARD_IDS = ADMIN_NICHE_CARDS.map((card) => card.id);

export function cardMatchesNiche(card: DashboardCardDef, niche: Niche | string) {
  return card.requires.every((capability) => hasCapability(niche, capability));
}

export function cardsFor(
  niche: Niche | string,
  audience: Audience,
  options: { opsBrainEnabled?: boolean } = {}
): DashboardCardDef[] {
  return DASHBOARD_CARDS.filter((card) => {
    if (card.audience !== audience) return false;
    if (card.opsBrain && !options.opsBrainEnabled) return false;
    return cardMatchesNiche(card, niche);
  });
}

export function cardById(id: string) {
  return DASHBOARD_CARDS.find((card) => card.id === id);
}
