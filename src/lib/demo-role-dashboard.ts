import type { Niche } from "@/lib/types";
import type { SharedDashboardData } from "@/lib/dashboard-data";
import {
  demoAppointments,
  demoCustomers,
  demoInvoices,
  demoProducts,
} from "@/lib/demo-dashboard-data";
import { DEMO_ORG } from "@/lib/demo-orgs";

/** Fake SharedDashboardData for homepage demos — never touches Supabase. */
export function buildDemoSharedDashboard(
  niche: Niche,
  role: "admin" | "staff"
): SharedDashboardData {
  const customers = demoCustomers(niche);
  const invoices = demoInvoices(niche);
  const products = demoProducts(niche);
  const appts = demoAppointments(niche);
  const lowStock = products.filter((p) => Number(p.quantity) <= 15 && p.track_stock !== false);

  const dbAlerts =
    role === "admin"
      ? [
          {
            id: "demo-a1",
            title: "High refund rate",
            message: "Staff sample refund rate 12% (7 days).",
            severity: "high" as const,
            status: "open",
          },
          {
            id: "demo-a2",
            title: "Reorder suggestion",
            message: "Top SKU below reorder point.",
            severity: "medium" as const,
            status: "open",
          },
          {
            id: "demo-a3",
            title: "Dead stock",
            message: "Slow mover 40+ days.",
            severity: "low" as const,
            status: "investigating",
          },
        ]
      : [
          {
            id: "demo-a2",
            title: "Reorder suggestion",
            message: "Check shelf for top SKU.",
            severity: "medium" as const,
            status: "open",
          },
          {
            id: "demo-a3",
            title: "Cycle count due",
            message: "Count 5 SKUs before close.",
            severity: "low" as const,
            status: "open",
          },
        ];

  const now = new Date();
  const todayAppts = appts.slice(0, 4).map((a, i) => {
    const start = new Date(now);
    start.setHours(9 + i * 2, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    return {
      id: a.id || `appt-${i}`,
      title: a.title || "Visit",
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: a.status,
      notes: a.notes,
      customers: a.customers || null,
    };
  });

  return {
    niche,
    orgName: DEMO_ORG[niche] || `Demo ${niche}`,
    welcomeName: role === "admin" ? "Owner Demo" : "Staff Demo",
    kpi: {
      salesToday: 1280,
      appointmentsToday: todayAppts.length,
      unpaidCount: invoices.filter((i) => i.status === "unpaid" || i.status === "partial").length || 3,
      customerCount: customers.length,
      lowStockCount: lowStock.length || 2,
      lowStockNames: lowStock.slice(0, 4).map((p) => p.name),
      income: 12000,
      expense: 7400,
      lhdnPending: 1,
      orgHasTin: true,
      txnToday: 18,
    },
    dbAlerts,
    opsBrainEnabled: true,
    recentInvoices: invoices.slice(0, 5).map((inv) => ({
      id: inv.id,
      label: inv.title || inv.invoice_number,
      subtitle: inv.invoice_number,
      amount: Number(inv.total || 0),
      at: inv.created_at,
    })),
    todaySales: invoices.slice(0, 4).map((inv) => ({
      id: inv.id,
      label: inv.title || inv.invoice_number,
      subtitle: null,
      amount: Number(inv.total || 0),
      at: inv.created_at,
    })),
    upcomingAppointments: todayAppts,
    todayAppointments: todayAppts,
    topSellers: products.slice(0, 4).map((p, i) => ({
      name: p.name,
      units: 40 - i * 7,
    })),
    staffScores:
      role === "admin"
        ? [
            {
              userId: "u1",
              name: "Ahmad",
              score: 78,
              salesAmount: 2400,
              refundRate: 12,
              transactionCount: 22,
            },
            {
              userId: "u2",
              name: "Siti",
              score: 91,
              salesAmount: 3100,
              refundRate: 2,
              transactionCount: 30,
            },
          ]
        : [],
    myScore:
      role === "staff"
        ? {
            userId: "me",
            name: "Staff Demo",
            score: 84,
            salesAmount: 900,
            refundRate: 3,
            transactionCount: 11,
          }
        : null,
    tasks: [
      {
        id: "t1",
        title: role === "admin" ? "Review cash variance" : "Restock Item A",
        status: "open",
        priority: "medium",
      },
      {
        id: "t2",
        title: "Cycle count shelf B",
        status: "in_progress",
        priority: "low",
      },
    ],
    briefing:
      role === "admin"
        ? "Demo briefing: sales steady. 1 high alert on refunds. Suggest check Ahmad's shift and reorder top SKU."
        : null,
    activitySummary:
      role === "admin"
        ? ["Ahmad: Voided ticket", "Siti: Closed cash session", "System: Low stock alert"]
        : [],
    marketingIdeas:
      niche === "tuition"
        ? ["Promote term packages", "Sibling discount"]
        : niche === "clinic"
          ? ["Remind overdue checkups", "Wellness packages"]
          : ["Weekend promo", "Bundle bestsellers"],
  };
}
