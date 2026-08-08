import { createClient } from "@/lib/supabase/server";
import { hasCapability } from "@/lib/niche-capabilities";
import { cardsFor } from "@/lib/dashboard-cards";
import { formatCurrency } from "@/lib/utils";
import type { Niche } from "@/lib/types";
import type { NicheCardPayload, NicheCardStat } from "@/lib/dashboard-data";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

type BuilderContext = {
  supabase: ServerSupabase;
  orgId: string;
  now: Date;
};

type Builder = (ctx: BuilderContext) => Promise<Omit<NicheCardPayload, "id">>;

const ROW_LIMIT = 6;
const WEEK_DAYS = 7;
const MONTH_DAYS = 30;
const DEAD_STOCK_DAYS = 45;
const BATCH_RISK_DAYS = 60;

function stat(key: string, value: string | number, tone?: NicheCardStat["tone"]): NicheCardStat {
  return { key, value: String(value), tone };
}

function since(now: Date, days: number) {
  return new Date(now.getTime() - days * 86400000);
}

function until(now: Date, days: number) {
  return new Date(now.getTime() + days * 86400000);
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function percent(part: number, whole: number) {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function ageInDays(now: Date, iso: string) {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000));
}

function countByStatus(rows: { status?: string | null }[] | null) {
  const counts = new Map<string, number>();
  for (const row of rows || []) {
    const key = String(row.status || "unknown");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function statusRows(counts: Map<string, number>, prefix: string) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, ROW_LIMIT)
    .map(([status, count]) => ({
      id: `${prefix}-${status}`,
      primary: status,
      meta: String(count),
    }));
}

/** Completed POS tickets joined to their invoice totals, grouped by the staff who rang them up. */
async function salesByStaff(supabase: ServerSupabase, orgId: string, from: Date) {
  const { data: tickets } = await supabase
    .from("pos_tickets")
    .select("created_by_name, completed_invoice_id, status")
    .eq("organization_id", orgId)
    .gte("created_at", from.toISOString())
    .limit(2000);

  const completed = (tickets || []).filter((ticket) => ticket.status === "completed");
  const invoiceIds = completed
    .map((ticket) => ticket.completed_invoice_id as string | null)
    .filter((id): id is string => Boolean(id));

  const { data: invoices } = invoiceIds.length
    ? await supabase
        .from("invoices")
        .select("id, total")
        .eq("organization_id", orgId)
        .in("id", invoiceIds)
    : { data: [] as { id: string; total: number }[] };

  const totalByInvoice = new Map(
    (invoices || []).map((invoice) => [invoice.id as string, Number(invoice.total || 0)])
  );

  const byStaff = new Map<string, { sales: number; tickets: number }>();
  for (const ticket of completed) {
    const name = String(ticket.created_by_name || "").trim() || "—";
    const entry = byStaff.get(name) || { sales: 0, tickets: 0 };
    entry.tickets += 1;
    entry.sales += totalByInvoice.get(String(ticket.completed_invoice_id)) || 0;
    byStaff.set(name, entry);
  }

  return { byStaff, allTickets: tickets || [] };
}

const buildStaffSales: Builder = async ({ supabase, orgId, now }) => {
  const { byStaff } = await salesByStaff(supabase, orgId, since(now, WEEK_DAYS));
  const ranked = [...byStaff.entries()].sort((a, b) => b[1].sales - a[1].sales);
  const total = ranked.reduce((sum, [, entry]) => sum + entry.sales, 0);

  return {
    href: "/pos",
    stats: [
      stat("weekSales", formatCurrency(total)),
      stat("sellers", ranked.length),
    ],
    rows: ranked.slice(0, ROW_LIMIT).map(([name, entry], index) => ({
      id: `${name}-${index}`,
      primary: name,
      secondary: `${entry.tickets}`,
      meta: formatCurrency(entry.sales),
      tone: index === 0 ? ("good" as const) : undefined,
    })),
  };
};

const buildVoidWatch: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("pos_tickets")
    .select("id, created_by_name, status")
    .eq("organization_id", orgId)
    .gte("created_at", since(now, WEEK_DAYS).toISOString())
    .limit(2000);

  const voided = (data || []).filter((ticket) => ticket.status === "void");
  const byStaff = new Map<string, number>();
  for (const ticket of voided) {
    const name = String(ticket.created_by_name || "").trim() || "—";
    byStaff.set(name, (byStaff.get(name) || 0) + 1);
  }
  const rate = data?.length ? voided.length / data.length : 0;

  return {
    href: "/receipts",
    stats: [
      stat("voidsWeek", voided.length, voided.length > 0 ? "warn" : undefined),
      stat("voidRate", `${Math.round(rate * 100)}%`, rate > 0.08 ? "danger" : undefined),
    ],
    rows: [...byStaff.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, ROW_LIMIT)
      .map(([name, count]) => ({
        id: `void-${name}`,
        primary: name,
        meta: String(count),
        tone: "warn" as const,
      })),
  };
};

const buildCashVariance: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("cash_sessions")
    .select("id, closed_by_name, variance, closed_at")
    .eq("organization_id", orgId)
    .eq("status", "closed")
    .gte("closed_at", since(now, MONTH_DAYS).toISOString())
    .order("closed_at", { ascending: false })
    .limit(100);

  const sessions = data || [];
  const totalVariance = sessions.reduce((sum, row) => sum + Number(row.variance || 0), 0);
  const offSessions = sessions.filter((row) => Math.abs(Number(row.variance || 0)) > 0);

  return {
    href: "/cash",
    stats: [
      stat("sessionsClosed", sessions.length),
      stat(
        "totalVariance",
        formatCurrency(totalVariance),
        Math.abs(totalVariance) > 0 ? "warn" : "good"
      ),
    ],
    rows: offSessions
      .sort((a, b) => Math.abs(Number(b.variance || 0)) - Math.abs(Number(a.variance || 0)))
      .slice(0, ROW_LIMIT)
      .map((row) => ({
        id: row.id as string,
        primary: (row.closed_by_name as string) || "—",
        secondary: (row.closed_at as string) || null,
        meta: formatCurrency(Number(row.variance || 0)),
        tone: Math.abs(Number(row.variance || 0)) > 20 ? ("danger" as const) : ("warn" as const),
      })),
  };
};

const buildApptUtilisation: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("organization_id", orgId)
    .gte("starts_at", since(now, MONTH_DAYS).toISOString())
    .lte("starts_at", now.toISOString())
    .limit(2000);

  const total = data?.length || 0;
  const counts = countByStatus(data);
  const noShow = counts.get("no_show") || 0;
  const cancelled = counts.get("cancelled") || 0;

  return {
    href: "/appointments",
    stats: [
      stat("bookedMonth", total),
      stat("noShowRate", percent(noShow, total), noShow / Math.max(1, total) > 0.1 ? "danger" : undefined),
      stat("cancelRate", percent(cancelled, total)),
    ],
    rows: statusRows(counts, "appt"),
  };
};

const buildStockValue: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("products")
    .select("id, name, quantity, cost_price, unit_price")
    .eq("organization_id", orgId)
    .limit(2000);

  const products = data || [];
  const costValue = products.reduce(
    (sum, product) => sum + Number(product.quantity) * Number(product.cost_price || 0),
    0
  );
  const retailValue = products.reduce(
    (sum, product) => sum + Number(product.quantity) * Number(product.unit_price || 0),
    0
  );

  return {
    href: "/inventory",
    stats: [
      stat("stockAtCost", formatCurrency(costValue)),
      stat("stockAtRetail", formatCurrency(retailValue)),
      stat("skuCount", products.length),
    ],
    rows: products
      .map((product) => ({
        id: product.id as string,
        primary: (product.name as string) || "—",
        meta: formatCurrency(Number(product.quantity) * Number(product.cost_price || 0)),
        value: Number(product.quantity) * Number(product.cost_price || 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, ROW_LIMIT)
      .map(({ id, primary, meta }) => ({ id, primary, meta })),
  };
};

const buildDeadStock: Builder = async ({ supabase, orgId, now }) => {
  const [{ data: products }, { data: movements }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, quantity, cost_price")
      .eq("organization_id", orgId)
      .gt("quantity", 0)
      .limit(2000),
    supabase
      .from("stock_movements")
      .select("product_id")
      .eq("organization_id", orgId)
      .eq("type", "sale")
      .gte("created_at", since(now, DEAD_STOCK_DAYS).toISOString())
      .limit(5000),
  ]);

  const sold = new Set((movements || []).map((movement) => String(movement.product_id)));
  const dead = (products || []).filter((product) => !sold.has(String(product.id)));
  const deadValue = dead.reduce(
    (sum, product) => sum + Number(product.quantity) * Number(product.cost_price || 0),
    0
  );

  return {
    href: "/inventory",
    stats: [
      stat("deadSkus", dead.length, dead.length > 0 ? "warn" : "good"),
      stat("deadValue", formatCurrency(deadValue), deadValue > 0 ? "warn" : undefined),
    ],
    rows: dead
      .map((product) => ({
        id: product.id as string,
        primary: (product.name as string) || "—",
        meta: formatCurrency(Number(product.quantity) * Number(product.cost_price || 0)),
        value: Number(product.quantity) * Number(product.cost_price || 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, ROW_LIMIT)
      .map(({ id, primary, meta }) => ({ id, primary, meta, tone: "warn" as const })),
  };
};

const buildCommissionPayout: Builder = async ({ supabase, orgId, now }) => {
  const [{ data: rules }, { byStaff }] = await Promise.all([
    supabase
      .from("salon_commission_rules")
      .select("id, staff_name, percent")
      .eq("organization_id", orgId)
      .limit(50),
    salesByStaff(supabase, orgId, since(now, MONTH_DAYS)),
  ]);

  const rows = (rules || []).map((rule) => {
    const sales = byStaff.get(String(rule.staff_name))?.sales || 0;
    const payout = (sales * Number(rule.percent || 0)) / 100;
    return {
      id: rule.id as string,
      primary: (rule.staff_name as string) || "—",
      secondary: formatCurrency(sales),
      meta: formatCurrency(payout),
      payout,
    };
  });
  const total = rows.reduce((sum, row) => sum + row.payout, 0);

  return {
    href: "/commissions",
    stats: [stat("payoutMonth", formatCurrency(total)), stat("sellers", rows.length)],
    rows: rows
      .sort((a, b) => b.payout - a.payout)
      .slice(0, ROW_LIMIT)
      .map(({ id, primary, secondary, meta }) => ({ id, primary, secondary, meta })),
  };
};

const buildBatchRisk: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("product_batches")
    .select("id, lot_number, expiry_date, quantity, products(name, cost_price)")
    .eq("organization_id", orgId)
    .not("expiry_date", "is", null)
    .lte("expiry_date", isoDate(until(now, BATCH_RISK_DAYS)))
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true })
    .limit(200);

  const rows = (data || []).map((batch) => {
    const product = Array.isArray(batch.products) ? batch.products[0] : batch.products;
    const value = Number(batch.quantity) * Number(product?.cost_price || 0);
    return {
      id: batch.id as string,
      primary: (product?.name as string | undefined) || "—",
      secondary: (batch.lot_number as string) || null,
      meta: formatCurrency(value),
      value,
      expiry: String(batch.expiry_date),
    };
  });
  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
  const today = isoDate(now);
  const expired = rows.filter((row) => row.expiry < today);

  return {
    href: "/batches",
    stats: [
      stat("atRiskValue", formatCurrency(totalValue), totalValue > 0 ? "warn" : "good"),
      stat("expired", expired.length, expired.length > 0 ? "danger" : undefined),
    ],
    rows: rows
      .sort((a, b) => b.value - a.value)
      .slice(0, ROW_LIMIT)
      .map(({ id, primary, secondary, meta, expiry }) => ({
        id,
        primary,
        secondary,
        meta,
        tone: expiry < today ? ("danger" as const) : ("warn" as const),
      })),
  };
};

const buildLabTurnaround: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("optical_lab_orders")
    .select("id, status, created_at, customers(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true })
    .limit(300);

  const open = (data || []).filter((order) => order.status !== "collected");
  const ages = open.map((order) => ageInDays(now, order.created_at as string));
  const averageAge = ages.length
    ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length)
    : 0;

  return {
    href: "/lab-orders",
    stats: [
      stat("openOrders", open.length),
      stat("averageAgeDays", averageAge, averageAge > 7 ? "warn" : undefined),
    ],
    rows: open.slice(0, ROW_LIMIT).map((order) => {
      const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
      const age = ageInDays(now, order.created_at as string);
      return {
        id: order.id as string,
        primary: (customer?.name as string | undefined) || "—",
        secondary: String(order.status),
        meta: `${age}d`,
        tone: age > 7 ? ("warn" as const) : undefined,
      };
    }),
  };
};

const buildJobThroughput: Builder = async ({ supabase, orgId, now }) => {
  const { data: jobs } = await supabase
    .from("job_cards")
    .select("id, status, created_at")
    .eq("organization_id", orgId)
    .gte("created_at", since(now, MONTH_DAYS).toISOString())
    .limit(500);

  const { data: lines } = await supabase
    .from("job_card_lines")
    .select("job_id, kind, amount")
    .in("job_id", (jobs || []).map((job) => job.id as string).slice(0, 200));

  const labour = (lines || [])
    .filter((line) => line.kind === "labour")
    .reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const parts = (lines || [])
    .filter((line) => line.kind !== "labour")
    .reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const jobCount = jobs?.length || 0;

  return {
    href: "/jobs",
    stats: [
      stat("jobsMonth", jobCount),
      stat("averageJobValue", formatCurrency(jobCount ? (labour + parts) / jobCount : 0)),
      stat("labourVsParts", `${formatCurrency(labour)} / ${formatCurrency(parts)}`),
    ],
    rows: statusRows(countByStatus(jobs), "job"),
  };
};

const buildLaundryAgeing: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("laundry_tickets")
    .select("id, ticket_number, status, created_at, customers(name)")
    .eq("organization_id", orgId)
    .neq("status", "collected")
    .order("created_at", { ascending: true })
    .limit(300);

  const uncollected = data || [];
  const stale = uncollected.filter((ticket) => ageInDays(now, ticket.created_at as string) >= 7);

  return {
    href: "/laundry",
    stats: [
      stat("uncollected", uncollected.length),
      stat("olderThanWeek", stale.length, stale.length > 0 ? "warn" : "good"),
    ],
    rows: stale.slice(0, ROW_LIMIT).map((ticket) => {
      const customer = Array.isArray(ticket.customers) ? ticket.customers[0] : ticket.customers;
      return {
        id: ticket.id as string,
        primary: (ticket.ticket_number as string) || "—",
        secondary: (customer?.name as string | undefined) || null,
        meta: `${ageInDays(now, ticket.created_at as string)}d`,
        tone: "warn" as const,
      };
    }),
  };
};

const buildClassFill: Builder = async ({ supabase, orgId }) => {
  const [{ data: classes }, { data: enrollments }] = await Promise.all([
    supabase
      .from("tuition_classes")
      .select("id, name, fee")
      .eq("organization_id", orgId)
      .limit(100),
    supabase
      .from("tuition_enrollments")
      .select("class_id")
      .eq("organization_id", orgId)
      .limit(5000),
  ]);

  const countByClass = new Map<string, number>();
  for (const enrollment of enrollments || []) {
    const key = String(enrollment.class_id);
    countByClass.set(key, (countByClass.get(key) || 0) + 1);
  }

  const rows = (classes || []).map((cls) => {
    const students = countByClass.get(String(cls.id)) || 0;
    return {
      id: cls.id as string,
      primary: (cls.name as string) || "—",
      secondary: formatCurrency(Number(cls.fee || 0)),
      meta: String(students),
      students,
    };
  });

  return {
    href: "/classes",
    stats: [
      stat("classesTotal", rows.length),
      stat("enrolled", enrollments?.length || 0),
      stat(
        "emptyClasses",
        rows.filter((row) => row.students === 0).length,
        rows.some((row) => row.students === 0) ? "warn" : undefined
      ),
    ],
    rows: rows
      .sort((a, b) => b.students - a.students)
      .slice(0, ROW_LIMIT)
      .map(({ id, primary, secondary, meta }) => ({ id, primary, secondary, meta })),
  };
};

const buildAttendanceRate: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("tuition_attendance")
    .select("id, present, attended_on")
    .eq("organization_id", orgId)
    .gte("attended_on", isoDate(since(now, MONTH_DAYS)))
    .limit(5000);

  const total = data?.length || 0;
  const present = (data || []).filter((row) => row.present === true).length;

  return {
    href: "/attendance",
    stats: [
      stat("marked", total),
      stat("attendanceRate", percent(present, total), present / Math.max(1, total) < 0.8 ? "warn" : "good"),
    ],
    rows: [],
  };
};

const buildTeacherPayroll: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("tuition_subjects")
    .select("id, name, teacher_name, teacher_salary, price")
    .eq("organization_id", orgId)
    .limit(200);

  const payroll = (data || []).reduce(
    (sum, subject) => sum + Number(subject.teacher_salary || 0),
    0
  );

  return {
    href: "/subjects",
    stats: [
      stat("subjects", data?.length || 0),
      stat("teacherPayroll", formatCurrency(payroll)),
    ],
    rows: (data || []).slice(0, ROW_LIMIT).map((subject) => ({
      id: subject.id as string,
      primary: (subject.teacher_name as string | null) || "—",
      secondary: (subject.name as string) || null,
      meta: formatCurrency(Number(subject.teacher_salary || 0)),
    })),
  };
};

const buildMembershipChurn: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("gym_memberships")
    .select("id, status, ends_on, plan_name")
    .eq("organization_id", orgId)
    .limit(2000);

  const counts = countByStatus(data);
  const active = counts.get("active") || 0;
  const today = isoDate(now);
  const lapsed = (data || []).filter(
    (row) => row.ends_on && String(row.ends_on) < today && row.status === "active"
  );

  const byPlan = new Map<string, number>();
  for (const row of data || []) {
    if (row.status !== "active") continue;
    const plan = String(row.plan_name || "—");
    byPlan.set(plan, (byPlan.get(plan) || 0) + 1);
  }

  return {
    href: "/memberships",
    stats: [
      stat("activeMembers", active),
      stat("lapsed", lapsed.length, lapsed.length > 0 ? "danger" : "good"),
      stat("churnRate", percent(lapsed.length, active + lapsed.length)),
    ],
    rows: [...byPlan.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, ROW_LIMIT)
      .map(([plan, count]) => ({ id: `plan-${plan}`, primary: plan, meta: String(count) })),
  };
};

const buildCheckinTrend: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("gym_checkins")
    .select("id, checked_in_at")
    .eq("organization_id", orgId)
    .gte("checked_in_at", since(now, MONTH_DAYS).toISOString())
    .limit(5000);

  const total = data?.length || 0;
  const lastWeek = (data || []).filter(
    (row) => new Date(row.checked_in_at as string) >= since(now, WEEK_DAYS)
  ).length;

  return {
    href: "/checkins",
    stats: [
      stat("checkinsMonth", total),
      stat("checkinsWeek", lastWeek),
      stat("dailyAverage", Math.round(total / MONTH_DAYS)),
    ],
    rows: [],
  };
};

const buildVaccinationCompliance: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("pet_vaccinations")
    .select("id, due_on, vaccine_name, pets(name)")
    .eq("organization_id", orgId)
    .not("due_on", "is", null)
    .limit(2000);

  const today = isoDate(now);
  const overdue = (data || []).filter((row) => String(row.due_on) < today);
  const total = data?.length || 0;

  return {
    href: "/pets",
    stats: [
      stat("trackedVaccinations", total),
      stat("overdue", overdue.length, overdue.length > 0 ? "danger" : "good"),
      stat("complianceRate", percent(total - overdue.length, total)),
    ],
    rows: overdue.slice(0, ROW_LIMIT).map((row) => {
      const pet = Array.isArray(row.pets) ? row.pets[0] : row.pets;
      return {
        id: row.id as string,
        primary: (pet?.name as string | undefined) || "—",
        secondary: (row.vaccine_name as string) || null,
        meta: String(row.due_on),
        tone: "danger" as const,
      };
    }),
  };
};

const buildPackageUtilisation: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("session_packages")
    .select("id, name, total_sessions, used_sessions")
    .eq("organization_id", orgId)
    .limit(2000);

  const totalSessions = (data || []).reduce(
    (sum, pkg) => sum + Number(pkg.total_sessions || 0),
    0
  );
  const usedSessions = (data || []).reduce((sum, pkg) => sum + Number(pkg.used_sessions || 0), 0);
  const unused = totalSessions - usedSessions;

  const byPackage = new Map<string, { total: number; used: number }>();
  for (const pkg of data || []) {
    const key = String(pkg.name || "—");
    const entry = byPackage.get(key) || { total: 0, used: 0 };
    entry.total += Number(pkg.total_sessions || 0);
    entry.used += Number(pkg.used_sessions || 0);
    byPackage.set(key, entry);
  }

  return {
    href: "/packages",
    stats: [
      stat("packagesSold", data?.length || 0),
      stat("utilisation", percent(usedSessions, totalSessions)),
      stat("sessionsOwed", unused, unused > 0 ? "warn" : undefined),
    ],
    rows: [...byPackage.entries()].slice(0, ROW_LIMIT).map(([name, entry]) => ({
      id: `pkg-${name}`,
      primary: name,
      secondary: percent(entry.used, entry.total),
      meta: `${entry.used} / ${entry.total}`,
    })),
  };
};

const buildLabTests: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("lab_results")
    .select("id, test_name, status, created_at")
    .eq("organization_id", orgId)
    .gte("created_at", since(now, MONTH_DAYS).toISOString())
    .limit(2000);

  const byTest = new Map<string, number>();
  for (const result of data || []) {
    const key = String(result.test_name || "—");
    byTest.set(key, (byTest.get(key) || 0) + 1);
  }
  const counts = countByStatus(data);

  return {
    href: "/lab-results",
    stats: [
      stat("testsMonth", data?.length || 0),
      stat("resultsPending", counts.get("pending") || 0),
      stat("released", counts.get("released") || 0, "good"),
    ],
    rows: [...byTest.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, ROW_LIMIT)
      .map(([name, count]) => ({ id: `test-${name}`, primary: name, meta: String(count) })),
  };
};

const buildVariantSellThrough: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("product_variants")
    .select("id, size, color, quantity, products(name)")
    .eq("organization_id", orgId)
    .limit(2000);

  const variants = data || [];
  const soldOut = variants.filter((variant) => Number(variant.quantity) <= 0);

  return {
    href: "/variants",
    stats: [
      stat("variantsTracked", variants.length),
      stat("soldOut", soldOut.length, soldOut.length > 0 ? "warn" : undefined),
      stat("sellThrough", percent(soldOut.length, variants.length)),
    ],
    rows: soldOut.slice(0, ROW_LIMIT).map((variant) => {
      const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
      return {
        id: variant.id as string,
        primary: (product?.name as string | undefined) || "—",
        secondary: [variant.size, variant.color].filter(Boolean).join(" / ") || null,
        meta: "0",
        tone: "warn" as const,
      };
    }),
  };
};

const buildSerialExposure: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("product_serials")
    .select("id, serial_number, status, products(name, unit_price)")
    .eq("organization_id", orgId)
    .limit(2000);

  const counts = countByStatus(data);
  const inStock = (data || []).filter((serial) => serial.status === "in_stock");
  const stockValue = inStock.reduce((sum, serial) => {
    const product = Array.isArray(serial.products) ? serial.products[0] : serial.products;
    return sum + Number(product?.unit_price || 0);
  }, 0);

  return {
    href: "/serials",
    stats: [
      stat("serialsTracked", data?.length || 0),
      stat("inStock", inStock.length),
      stat("serialStockValue", formatCurrency(stockValue)),
    ],
    rows: statusRows(counts, "serial"),
  };
};

const buildPriceTierMix: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("price_tiers")
    .select("id, name, discount_percent")
    .eq("organization_id", orgId)
    .order("discount_percent", { ascending: false })
    .limit(50);

  const tiers = data || [];
  const deepest = tiers.length ? Number(tiers[0].discount_percent || 0) : 0;

  return {
    href: "/price-tiers",
    stats: [
      stat("tiers", tiers.length),
      stat("deepestDiscount", `${deepest}%`, deepest >= 20 ? "warn" : undefined),
    ],
    rows: tiers.slice(0, ROW_LIMIT).map((tier) => ({
      id: tier.id as string,
      primary: (tier.name as string) || "—",
      meta: `${Number(tier.discount_percent || 0)}%`,
      tone: Number(tier.discount_percent || 0) >= 20 ? ("warn" as const) : undefined,
    })),
  };
};

const buildTableTurnover: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("dining_tables")
    .select("id, name, seats, status")
    .eq("organization_id", orgId)
    .limit(300);

  const tables = data || [];
  const occupied = tables.filter((table) => table.status !== "free");
  const seats = tables.reduce((sum, table) => sum + Number(table.seats || 0), 0);

  return {
    href: "/tables",
    stats: [
      stat("tablesTotal", tables.length),
      stat("seatsTotal", seats),
      stat("occupancy", percent(occupied.length, tables.length)),
    ],
    rows: statusRows(countByStatus(tables), "table"),
  };
};

const buildOccupancy: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("hotel_rooms")
    .select("id, room_number, room_type, status, rate")
    .eq("organization_id", orgId)
    .limit(500);

  const rooms = data || [];
  const occupied = rooms.filter((room) => room.status === "occupied");
  const averageRate = rooms.length
    ? rooms.reduce((sum, room) => sum + Number(room.rate || 0), 0) / rooms.length
    : 0;
  const revpar = rooms.length
    ? occupied.reduce((sum, room) => sum + Number(room.rate || 0), 0) / rooms.length
    : 0;

  return {
    href: "/rooms",
    stats: [
      stat("occupancy", percent(occupied.length, rooms.length)),
      stat("averageRate", formatCurrency(averageRate)),
      stat("revpar", formatCurrency(revpar)),
    ],
    rows: statusRows(countByStatus(rooms), "room"),
  };
};

const buildListingPipeline: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("property_listings")
    .select("id, title, status, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true })
    .limit(500);

  const listings = data || [];
  const available = listings.filter((listing) => listing.status === "available");
  const ages = available.map((listing) => ageInDays(now, listing.created_at as string));
  const averageAge = ages.length
    ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length)
    : 0;

  return {
    href: "/listings",
    stats: [
      stat("listingsTotal", listings.length),
      stat("daysOnMarket", averageAge, averageAge > 90 ? "warn" : undefined),
    ],
    rows: statusRows(countByStatus(listings), "listing"),
  };
};

const buildShipmentService: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("courier_shipments")
    .select("id, tracking_no, status, created_at")
    .eq("organization_id", orgId)
    .gte("created_at", since(now, MONTH_DAYS).toISOString())
    .limit(2000);

  const shipments = data || [];
  const delivered = shipments.filter((shipment) => shipment.status === "delivered");
  const stale = shipments.filter(
    (shipment) =>
      shipment.status !== "delivered" && ageInDays(now, shipment.created_at as string) >= 3
  );

  return {
    href: "/shipments",
    stats: [
      stat("shipmentsMonth", shipments.length),
      stat("deliveredRate", percent(delivered.length, shipments.length), "good"),
      stat("stuck", stale.length, stale.length > 0 ? "warn" : undefined),
    ],
    rows: stale.slice(0, ROW_LIMIT).map((shipment) => ({
      id: shipment.id as string,
      primary: (shipment.tracking_no as string) || "—",
      secondary: String(shipment.status),
      meta: `${ageInDays(now, shipment.created_at as string)}d`,
      tone: "warn" as const,
    })),
  };
};

const buildProjectClaims: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("contractor_projects")
    .select("id, name, status, claim_amount, created_at")
    .eq("organization_id", orgId)
    .limit(500);

  const projects = data || [];
  const open = projects.filter((project) => project.status !== "closed");
  const claims = open.reduce((sum, project) => sum + Number(project.claim_amount || 0), 0);

  return {
    href: "/projects",
    stats: [
      stat("activeProjects", open.length),
      stat("claimsOutstanding", formatCurrency(claims)),
    ],
    rows: open
      .sort(
        (a, b) =>
          ageInDays(now, b.created_at as string) - ageInDays(now, a.created_at as string)
      )
      .slice(0, ROW_LIMIT)
      .map((project) => ({
        id: project.id as string,
        primary: (project.name as string) || "—",
        secondary: String(project.status),
        meta: `${ageInDays(now, project.created_at as string)}d`,
      })),
  };
};

const buildWipAgeing: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("manufacturing_orders")
    .select("id, name, status, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true })
    .limit(500);

  const orders = data || [];
  const open = orders.filter((order) => order.status !== "done");
  const stale = open.filter((order) => ageInDays(now, order.created_at as string) >= 14);

  return {
    href: "/work-orders",
    stats: [
      stat("ordersOpen", open.length),
      stat("olderThanTwoWeeks", stale.length, stale.length > 0 ? "warn" : "good"),
    ],
    rows: open.slice(0, ROW_LIMIT).map((order) => ({
      id: order.id as string,
      primary: (order.name as string) || "—",
      secondary: String(order.status),
      meta: `${ageInDays(now, order.created_at as string)}d`,
      tone: ageInDays(now, order.created_at as string) >= 14 ? ("warn" as const) : undefined,
    })),
  };
};

const buildMatterStatus: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("legal_matters")
    .select("id, title, status, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true })
    .limit(500);

  const matters = data || [];
  const open = matters.filter((matter) => matter.status !== "closed");
  const aged = open.filter((matter) => ageInDays(now, matter.created_at as string) >= 90);

  return {
    href: "/matters",
    stats: [
      stat("openMatters", open.length),
      stat("olderThanQuarter", aged.length, aged.length > 0 ? "warn" : undefined),
    ],
    rows: statusRows(countByStatus(matters), "matter"),
  };
};

const buildEventPipeline: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("event_plans")
    .select("id, title, event_date, status")
    .eq("organization_id", orgId)
    .gte("event_date", isoDate(now))
    .order("event_date", { ascending: true })
    .limit(300);

  const events = data || [];
  const byMonth = new Map<string, number>();
  for (const event of events) {
    const key = String(event.event_date || "").slice(0, 7) || "—";
    byMonth.set(key, (byMonth.get(key) || 0) + 1);
  }
  const counts = countByStatus(events);

  return {
    href: "/events",
    stats: [
      stat("upcomingEvents", events.length),
      stat("confirmed", counts.get("confirmed") || 0, "good"),
      stat("planning", counts.get("planning") || 0),
    ],
    rows: [...byMonth.entries()].slice(0, ROW_LIMIT).map(([month, count]) => ({
      id: `month-${month}`,
      primary: month,
      meta: String(count),
    })),
  };
};

const buildPlotStatus: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("farm_plots")
    .select("id, name, crop, status")
    .eq("organization_id", orgId)
    .limit(500);

  const plots = data || [];
  const byCrop = new Map<string, number>();
  for (const plot of plots) {
    const key = String(plot.crop || "—");
    byCrop.set(key, (byCrop.get(key) || 0) + 1);
  }

  return {
    href: "/plots",
    stats: [
      stat("plotsTotal", plots.length),
      stat("plotsPlanted", plots.filter((plot) => plot.status === "planted").length, "good"),
      stat("plotsIdle", plots.filter((plot) => plot.status === "idle").length),
    ],
    rows: [...byCrop.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, ROW_LIMIT)
      .map(([crop, count]) => ({ id: `crop-${crop}`, primary: crop, meta: String(count) })),
  };
};

const BUILDERS: Record<string, Builder> = {
  adminStaffSales: buildStaffSales,
  adminVoidWatch: buildVoidWatch,
  adminCashVariance: buildCashVariance,
  adminApptUtilisation: buildApptUtilisation,
  adminStockValue: buildStockValue,
  adminDeadStock: buildDeadStock,
  adminCommissionPayout: buildCommissionPayout,
  adminBatchRisk: buildBatchRisk,
  adminLabTurnaround: buildLabTurnaround,
  adminJobThroughput: buildJobThroughput,
  adminLaundryAgeing: buildLaundryAgeing,
  adminClassFill: buildClassFill,
  adminAttendanceRate: buildAttendanceRate,
  adminTeacherPayroll: buildTeacherPayroll,
  adminMembershipChurn: buildMembershipChurn,
  adminCheckinTrend: buildCheckinTrend,
  adminVaccinationCompliance: buildVaccinationCompliance,
  adminPackageUtilisation: buildPackageUtilisation,
  adminLabTests: buildLabTests,
  adminVariantSellThrough: buildVariantSellThrough,
  adminSerialExposure: buildSerialExposure,
  adminPriceTierMix: buildPriceTierMix,
  adminTableTurnover: buildTableTurnover,
  adminOccupancy: buildOccupancy,
  adminListingPipeline: buildListingPipeline,
  adminShipmentService: buildShipmentService,
  adminProjectClaims: buildProjectClaims,
  adminWipAgeing: buildWipAgeing,
  adminMatterStatus: buildMatterStatus,
  adminEventPipeline: buildEventPipeline,
  adminPlotStatus: buildPlotStatus,
};

/** Card ids the admin loader can fill. Used by the coverage test. */
export const ADMIN_NICHE_BUILDER_IDS = Object.keys(BUILDERS);

/** Same contract as the staff cards; a failing card is dropped, never fatal. */
export async function loadAdminNicheCards({
  supabase,
  orgId,
  niche,
  now,
}: {
  supabase: ServerSupabase;
  orgId: string;
  niche: Niche;
  now: Date;
}): Promise<NicheCardPayload[]> {
  const ctx: BuilderContext = { supabase, orgId, now };

  const wanted = cardsFor(niche, "admin").filter(
    (card) => BUILDERS[card.id] && card.requires.every((cap) => hasCapability(niche, cap))
  );

  const results = await Promise.all(
    wanted.map(async (card) => {
      try {
        const payload = await BUILDERS[card.id](ctx);
        return { id: card.id, ...payload } satisfies NicheCardPayload;
      } catch {
        return null;
      }
    })
  );

  return results.filter((card): card is NicheCardPayload => card !== null);
}
