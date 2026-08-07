import { hasCapability } from "@/lib/niches";
import { DEMO_ORG } from "@/lib/demo-orgs";
import { marketingPlays } from "@/lib/marketing-plays";
import { buildDemoNicheCards } from "@/lib/demo-niche-cards";
import { buildDemoAdminNicheCards } from "@/lib/demo-admin-niche-cards";
import { formatDayKeyMY } from "@/lib/datetime-my";
import type { Audience, Niche } from "@/lib/types";
import {
  RECEIVABLE_OVERDUE_DAYS,
  REVENUE_TREND_DAYS,
  type AdminInsights,
  type DashboardAppointmentRow,
  type DashboardInvoiceRow,
  type DashboardSaleRow,
  type DashboardTopSellerRow,
  type SharedDashboardData,
} from "@/lib/dashboard-data";

/**
 * Fills the same contract as the live loader with believable fake numbers, so the
 * homepage demo renders through the identical views and can never drift from the app.
 */

const DEMO_INVOICES: DashboardInvoiceRow[] = [
  {
    id: "1",
    title: "Consult + meds",
    invoice_number: "INV-1042",
    status: "paid",
    total: 85,
    created_at: "2026-08-04T09:12:00+08:00",
  },
  {
    id: "2",
    title: "Walk-in treatment",
    invoice_number: "INV-1041",
    status: "unpaid",
    total: 120,
    created_at: "2026-08-04T08:40:00+08:00",
  },
  {
    id: "3",
    title: "Follow-up",
    invoice_number: "INV-1040",
    status: "partial",
    total: 60,
    created_at: "2026-08-03T16:20:00+08:00",
  },
  {
    id: "4",
    title: "Lab panel",
    invoice_number: "INV-1039",
    status: "paid",
    total: 95,
    created_at: "2026-08-03T11:05:00+08:00",
  },
  {
    id: "5",
    title: "Procedure",
    invoice_number: "INV-1038",
    status: "paid",
    total: 45,
    created_at: "2026-08-02T15:30:00+08:00",
  },
];

const DEMO_APPOINTMENT_SLOTS = [
  { id: "a1", title: "Consult", h: 9, m: 0, dur: 30, name: "Nurul Aisyah", risk: "low" as const, allergies: null as string | null },
  { id: "a2", title: "Follow-up", h: 10, m: 30, dur: 30, name: "Rajesh K.", risk: "medium" as const, allergies: "Penicillin" },
  { id: "a3", title: "Walk-in", h: 14, m: 0, dur: 20, name: "Lim Wei", risk: "low" as const, allergies: null },
  { id: "a4", title: "Consult", h: 16, m: 30, dur: 30, name: "Aina Rahman", risk: "high" as const, allergies: "Nuts" },
];

const DEMO_SALES: DashboardSaleRow[] = [
  { id: "s1", label: "Counter sale", customer: "Walk-in", amount: 86, paid_at: "2026-08-04T10:12:00+08:00" },
  { id: "s2", label: "Counter sale", customer: "Cash", amount: 42.5, paid_at: "2026-08-04T11:05:00+08:00" },
  { id: "s3", label: "QR payment", customer: "Mei Ling", amount: 125, paid_at: "2026-08-04T12:40:00+08:00" },
  { id: "s4", label: "Counter sale", customer: "Walk-in", amount: 18.9, paid_at: "2026-08-04T14:18:00+08:00" },
];

const DEMO_TOP_SELLERS: DashboardTopSellerRow[] = [
  { name: "Paracetamol 500mg", units: 38 },
  { name: "Saline 500ml", units: 22 },
  { name: "Gloves M", units: 19 },
  { name: "Alcohol swab", units: 14 },
];

function demoAppointments(day: Date): DashboardAppointmentRow[] {
  return DEMO_APPOINTMENT_SLOTS.map((slot) => {
    const start = new Date(day);
    start.setHours(slot.h, slot.m, 0, 0);
    const end = new Date(start.getTime() + slot.dur * 60000);
    return {
      id: slot.id,
      title: slot.title,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "confirmed",
      customers: { name: slot.name, risk_level: slot.risk, allergies: slot.allergies },
    };
  });
}

function demoLowStock(niche: Niche): string[] {
  if (hasCapability(niche, "pos")) {
    return ["Cable 2m", "Adapter USB-C", "Power bank", "Tape pack", "Mouse pad"];
  }
  if (niche === "clinic") return ["Gloves M", "Saline"];
  return [];
}

function demoCustomerCount(niche: Niche) {
  if (niche === "gym") return 186;
  if (niche === "retail") return 420;
  return 248;
}

/** Stable pseudo-random so the demo trend looks alive but never changes between renders. */
function demoTrendAmount(index: number, base: number) {
  const wave = Math.sin(index * 1.1) * 0.28 + Math.cos(index * 0.47) * 0.14;
  return Math.round(base * (1 + wave));
}

const DEMO_ACTIVITY = [
  { id: "l1", actor: "Farah", summary: "Recorded payment for INV-1042", minutesAgo: 25 },
  { id: "l2", actor: "Danial", summary: "Closed cash session with RM0 variance", minutesAgo: 95 },
  { id: "l3", actor: "Farah", summary: "Adjusted stock for Gloves M", minutesAgo: 180 },
  { id: "l4", actor: "Siti", summary: "Created invoice INV-1041", minutesAgo: 260 },
  { id: "l5", actor: "Danial", summary: "Added customer Mei Ling", minutesAgo: 400 },
];

function buildDemoAdminInsights(niche: Niche, locale: string, now: Date): AdminInsights {
  const canPos = hasCapability(niche, "pos");
  const base = canPos ? 2100 : 1150;

  const revenueTrend = Array.from({ length: REVENUE_TREND_DAYS }, (_, index) => {
    const offset = REVENUE_TREND_DAYS - 1 - index;
    return {
      day: formatDayKeyMY(new Date(now.getTime() - offset * 86400000)),
      amount: demoTrendAmount(index, base),
    };
  });

  return {
    revenueTrend,
    lastMonthIncome: 11240,
    lastMonthExpense: 4480,
    receivablesCurrent: 1840,
    receivablesOverdue: 620,
    receivablesOverdueCount: 2,
    overdueAfterDays: RECEIVABLE_OVERDUE_DAYS,
    activity: DEMO_ACTIVITY.map((entry) => ({
      id: entry.id,
      actor: entry.actor,
      summary: entry.summary,
      created_at: new Date(now.getTime() - entry.minutesAgo * 60000).toISOString(),
    })),
    teamSize: 6,
    branchCount: 2,
    marketing: marketingPlays(niche, locale),
  };
}

export function buildDemoDashboard({
  niche,
  audience,
  now,
  locale,
}: {
  niche: Niche;
  audience: Audience;
  now: Date;
  locale: string;
}): SharedDashboardData {
  const canPos = hasCapability(niche, "pos");
  const canAppointments = hasCapability(niche, "appointments");
  const appointments = demoAppointments(now);
  const lowStockNames = demoLowStock(niche);
  const orgName = DEMO_ORG[niche];

  return {
    niche,
    audience,
    orgName,
    greetingName: orgName,
    nowIso: now.toISOString(),
    hours: { openHour: 8, closeHour: 18, closedWeekdays: [] },
    kpis: {
      appointmentsToday: canAppointments ? 12 : 0,
      noShowToday: canAppointments ? 1 : 0,
      salesToday: canPos ? 2450 : 1280,
      txnToday: canPos ? 47 : 0,
      unpaidCount: 3,
      unpaidTotal: 265,
      customerCount: demoCustomerCount(niche),
      lowStockCount: lowStockNames.length,
      lowStockNames,
      incomeMonth: 12480,
      expenseMonth: 4210,
      lhdnPendingCount: 1,
      lhdnRejectedCount: 0,
      orgHasTin: true,
    },
    recentInvoices: DEMO_INVOICES,
    upcomingAppointments: canAppointments ? appointments : appointments.slice(0, 2),
    todayAppointments: appointments,
    todaySales: DEMO_SALES,
    topSellers: DEMO_TOP_SELLERS,
    nicheCards:
      audience === "admin"
        ? buildDemoAdminNicheCards(niche)
        : buildDemoNicheCards(niche, now),
    adminInsights:
      audience === "admin" ? buildDemoAdminInsights(niche, locale, now) : undefined,
  };
}
