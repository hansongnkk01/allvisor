import type { Niche } from "@/lib/types";
import type { DbAlertTip } from "@/components/DashboardAiPanel";

export type DashboardMode = "live" | "demo";
export type DashboardRoleView = "admin" | "staff";

export type DashboardKpi = {
  salesToday: number;
  appointmentsToday: number;
  unpaidCount: number;
  customerCount: number;
  lowStockCount: number;
  lowStockNames: string[];
  income: number;
  expense: number;
  lhdnPending: number;
  orgHasTin: boolean;
  txnToday: number;
};

export type DashboardListRow = {
  id: string;
  label: string;
  subtitle?: string | null;
  amount?: number;
  at?: string;
};

export type StaffScoreRow = {
  userId: string;
  name: string;
  score: number;
  salesAmount: number;
  refundRate: number;
  transactionCount: number;
};

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignedToName?: string | null;
};

/** Admin-only oversight slices — never loaded for the staff view. */
export type AdminInsights = {
  salesTrend: Array<{ day: string; amount: number }>;
  monthIncome: number;
  monthExpense: number;
  prevMonthIncome: number;
  receivables: { current: number; overdue: number; overdueCount: number };
  staffActivity: Array<{ actor: string; summary: string; at: string }>;
  teamSize: number;
  branchCount: number;
  marketingIdeas: string[];
};

export type SharedDashboardData = {
  niche: Niche;
  orgName: string;
  welcomeName: string;
  kpi: DashboardKpi;
  dbAlerts: DbAlertTip[];
  opsBrainEnabled: boolean;
  recentInvoices: DashboardListRow[];
  todaySales: DashboardListRow[];
  upcomingAppointments: Array<{
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
  }>;
  todayAppointments: SharedDashboardData["upcomingAppointments"];
  topSellers: Array<{ name: string; units: number }>;
  staffScores: StaffScoreRow[];
  myScore: StaffScoreRow | null;
  tasks: TaskRow[];
  briefing: string | null;
  activitySummary: string[];
  marketingIdeas: string[];
  /** Present only when the admin view loaded the data. */
  adminInsights?: AdminInsights;
};
