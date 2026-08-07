import type { Audience, Niche } from "@/lib/types";

/**
 * The single contract every dashboard surface renders from. Everything here must be
 * plain serializable data so the same object can come from Supabase on the server or
 * from the demo generator in the browser and produce byte-identical layout.
 */

export type DashboardKpis = {
  appointmentsToday: number;
  noShowToday: number;
  salesToday: number;
  txnToday: number;
  unpaidCount: number;
  unpaidTotal: number;
  customerCount: number;
  lowStockCount: number;
  lowStockNames: string[];
  incomeMonth: number;
  expenseMonth: number;
  lhdnPendingCount: number;
  lhdnRejectedCount: number;
  orgHasTin: boolean;
};

export type DashboardInvoiceRow = {
  id: string;
  title: string;
  invoice_number: string;
  status: string;
  total: number;
  created_at: string;
};

export type DashboardAppointmentRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status?: string;
  notes?: string | null;
  customers?: {
    name: string;
    risk_level?: "high" | "medium" | "low" | null;
    allergies?: string | null;
  } | null;
};

export type DashboardSaleRow = {
  id: string;
  label: string;
  customer: string | null;
  amount: number;
  paid_at: string;
};

export type DashboardTopSellerRow = {
  name: string;
  units: number;
};

export type DashboardOpeningHours = {
  openHour: number;
  closeHour: number;
  closedWeekdays: number[];
};

export type CardTone = "neutral" | "good" | "warn" | "danger";

export type NicheCardStat = {
  /** Message key under DashCards.stat */
  key: string;
  value: string;
  tone?: CardTone;
};

export type NicheCardRow = {
  id: string;
  primary: string;
  secondary?: string | null;
  meta?: string | null;
  tone?: CardTone;
};

/**
 * Niche cards are data only. Every label is looked up by key in the renderer so one
 * component draws all of them and no niche can invent its own layout.
 */
export type NicheCardPayload = {
  /** Matches a card id in the registry. */
  id: string;
  stats: NicheCardStat[];
  rows: NicheCardRow[];
  href?: string;
};

export type RevenueTrendPoint = {
  /** YYYY-MM-DD in Malaysia time, or a bucket key when the window is not daily. */
  day: string;
  amount: number;
  /** Axis label; falls back to the day of month when absent. */
  label?: string;
};

export type ActivityEntry = {
  id: string;
  actor: string | null;
  summary: string;
  created_at: string;
};

export type MarketingIdea = {
  id: string;
  title: string;
  body: string;
};

/** Owner-only slice. Absent for the staff audience so the data never leaves the server. */
export type AdminInsights = {
  revenueTrend: RevenueTrendPoint[];
  lastMonthIncome: number;
  lastMonthExpense: number;
  receivablesCurrent: number;
  receivablesOverdue: number;
  receivablesOverdueCount: number;
  overdueAfterDays: number;
  activity: ActivityEntry[];
  teamSize: number;
  branchCount: number;
  marketing: MarketingIdea[];
};

export type SharedDashboardData = {
  niche: Niche;
  audience: Audience;
  orgName: string;
  /** Name shown in the greeting — the member's own name in the real app. */
  greetingName: string;
  /** ISO timestamp the whole screen is rendered against, so lists and timetable agree. */
  nowIso: string;
  hours: DashboardOpeningHours;
  kpis: DashboardKpis;
  recentInvoices: DashboardInvoiceRow[];
  upcomingAppointments: DashboardAppointmentRow[];
  todayAppointments: DashboardAppointmentRow[];
  todaySales: DashboardSaleRow[];
  topSellers: DashboardTopSellerRow[];
  nicheCards: NicheCardPayload[];
  adminInsights?: AdminInsights;
};

export const REVENUE_TREND_DAYS = 14;
export const RECEIVABLE_OVERDUE_DAYS = 30;

export function lhdnOutstanding(kpis: DashboardKpis) {
  return kpis.lhdnPendingCount + kpis.lhdnRejectedCount;
}
