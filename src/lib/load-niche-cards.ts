import { createClient } from "@/lib/supabase/server";
import { hasCapability } from "@/lib/niche-capabilities";
import { cardsFor } from "@/lib/dashboard-cards";
import { dayBoundsMY } from "@/lib/datetime-my";
import { formatCurrency } from "@/lib/utils";
import type { Niche } from "@/lib/types";
import type { NicheCardPayload, NicheCardRow, NicheCardStat } from "@/lib/dashboard-data";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

type BuilderContext = {
  supabase: ServerSupabase;
  orgId: string;
  now: Date;
  todayStart: Date;
  todayEnd: Date;
};

type Builder = (ctx: BuilderContext) => Promise<Omit<NicheCardPayload, "id">>;

const ROW_LIMIT = 6;
const EXPIRY_WINDOW_DAYS = 60;
const MEMBERSHIP_WINDOW_DAYS = 30;
const VACCINATION_WINDOW_DAYS = 30;

function daysFromNow(now: Date, days: number) {
  return new Date(now.getTime() + days * 86400000);
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function countByStatus(rows: { status?: string | null }[] | null) {
  const counts = new Map<string, number>();
  for (const row of rows || []) {
    const key = String(row.status || "unknown");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function stat(key: string, value: string | number, tone?: NicheCardStat["tone"]): NicheCardStat {
  return { key, value: String(value), tone };
}

const buildCashSession: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("cash_sessions")
    .select("id, opened_by_name, opening_float, opened_at")
    .eq("organization_id", orgId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { stats: [], rows: [], href: "/cash" };

  return {
    href: "/cash",
    stats: [
      stat("openedBy", (data.opened_by_name as string) || "—"),
      stat("openingFloat", formatCurrency(Number(data.opening_float || 0))),
    ],
    rows: [
      {
        id: data.id as string,
        primary: (data.opened_by_name as string) || "—",
        secondary: data.opened_at as string,
        meta: formatCurrency(Number(data.opening_float || 0)),
        tone: "good",
      },
    ],
  };
};

const buildPosTickets: Builder = async ({ supabase, orgId, todayStart, todayEnd }) => {
  const [{ data: todayTickets }, { data: pending }] = await Promise.all([
    supabase
      .from("pos_tickets")
      .select("id, status")
      .eq("organization_id", orgId)
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString())
      .limit(500),
    supabase
      .from("pos_tickets")
      .select("id, ticket_number, status, created_by_name, created_at")
      .eq("organization_id", orgId)
      .in("status", ["open", "held"])
      .order("created_at", { ascending: true })
      .limit(ROW_LIMIT),
  ]);

  const counts = countByStatus(todayTickets);
  const held = (pending || []).filter((ticket) => ticket.status === "held").length;

  return {
    href: "/pos",
    stats: [
      stat("completedToday", counts.get("completed") || 0),
      stat("heldTickets", held, held > 0 ? "warn" : undefined),
      stat("voidToday", counts.get("void") || 0, (counts.get("void") || 0) > 0 ? "warn" : undefined),
    ],
    rows: (pending || []).map((ticket) => ({
      id: ticket.id as string,
      primary: (ticket.ticket_number as string) || "—",
      secondary: (ticket.created_by_name as string) || null,
      meta: String(ticket.status),
      tone: ticket.status === "held" ? ("warn" as const) : undefined,
    })),
  };
};

const buildLowStock: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("products")
    .select("id, name, quantity, low_stock_threshold")
    .eq("organization_id", orgId)
    .limit(1000);

  const low = (data || []).filter(
    (product) => Number(product.quantity) <= Number(product.low_stock_threshold)
  );
  const out = low.filter((product) => Number(product.quantity) <= 0);

  return {
    href: "/inventory",
    stats: [
      stat("itemsLow", low.length, low.length > 0 ? "warn" : undefined),
      stat("itemsOut", out.length, out.length > 0 ? "danger" : undefined),
    ],
    rows: low.slice(0, ROW_LIMIT).map((product) => ({
      id: product.id as string,
      primary: (product.name as string) || "—",
      meta: `${Number(product.quantity)} / ${Number(product.low_stock_threshold)}`,
      tone: Number(product.quantity) <= 0 ? ("danger" as const) : ("warn" as const),
    })),
  };
};

const buildJobCards: Builder = async ({ supabase, orgId }) => {
  const { data: allJobs } = await supabase
    .from("job_cards")
    .select("id, title, status, created_at, vehicles(plate)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true })
    .limit(200);

  const data = (allJobs || []).filter(
    (job) => job.status !== "collected" && job.status !== "closed"
  );
  const counts = countByStatus(data);

  return {
    href: "/jobs",
    stats: [
      stat("jobsOpen", data.length),
      stat("jobsInProgress", counts.get("in_progress") || 0),
    ],
    rows: data.slice(0, ROW_LIMIT).map((job) => {
      const vehicle = Array.isArray(job.vehicles) ? job.vehicles[0] : job.vehicles;
      return {
        id: job.id as string,
        primary: (job.title as string) || "—",
        secondary: (vehicle?.plate as string | undefined) || null,
        meta: String(job.status),
      };
    }),
  };
};

const buildLaundry: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("laundry_tickets")
    .select("id, ticket_number, status, item_count, created_at, customers(name)")
    .eq("organization_id", orgId)
    .neq("status", "collected")
    .order("created_at", { ascending: true })
    .limit(100);

  const counts = countByStatus(data);
  const ready = (data || []).filter((ticket) => ticket.status === "ready");

  return {
    href: "/laundry",
    stats: [
      stat("ticketsReceived", counts.get("received") || 0),
      stat("ticketsInProgress", counts.get("in_progress") || 0),
      stat("ticketsReady", ready.length, ready.length > 0 ? "good" : undefined),
    ],
    rows: (ready.length ? ready : data || []).slice(0, ROW_LIMIT).map((ticket) => {
      const customer = Array.isArray(ticket.customers) ? ticket.customers[0] : ticket.customers;
      return {
        id: ticket.id as string,
        primary: (ticket.ticket_number as string) || "—",
        secondary: (customer?.name as string | undefined) || null,
        meta: String(ticket.status),
        tone: ticket.status === "ready" ? ("good" as const) : undefined,
      };
    }),
  };
};

const buildCommissions: Builder = async ({ supabase, orgId, todayStart, todayEnd }) => {
  const [{ data: rules }, { data: tickets }] = await Promise.all([
    supabase
      .from("salon_commission_rules")
      .select("id, staff_name, percent")
      .eq("organization_id", orgId)
      .limit(50),
    supabase
      .from("pos_tickets")
      .select("created_by_name, completed_invoice_id")
      .eq("organization_id", orgId)
      .eq("status", "completed")
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString())
      .limit(500),
  ]);

  const invoiceIds = (tickets || [])
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

  const salesByStaff = new Map<string, number>();
  for (const ticket of tickets || []) {
    const name = String(ticket.created_by_name || "").trim();
    const invoiceId = ticket.completed_invoice_id as string | null;
    if (!name || !invoiceId) continue;
    salesByStaff.set(name, (salesByStaff.get(name) || 0) + (totalByInvoice.get(invoiceId) || 0));
  }

  const rows: NicheCardRow[] = (rules || []).map((rule) => {
    const sales = salesByStaff.get(String(rule.staff_name)) || 0;
    const percent = Number(rule.percent || 0);
    return {
      id: rule.id as string,
      primary: (rule.staff_name as string) || "—",
      secondary: `${percent}%`,
      meta: formatCurrency((sales * percent) / 100),
    };
  });

  const totalCommission = rows.reduce((sum, row) => {
    const rule = (rules || []).find((candidate) => candidate.id === row.id);
    const sales = salesByStaff.get(String(rule?.staff_name)) || 0;
    return sum + (sales * Number(rule?.percent || 0)) / 100;
  }, 0);

  return {
    href: "/commissions",
    stats: [
      stat("salesToday", formatCurrency([...salesByStaff.values()].reduce((a, b) => a + b, 0))),
      stat("commissionToday", formatCurrency(totalCommission)),
    ],
    rows,
  };
};

const buildEyeRx: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("eye_prescriptions")
    .select("id, created_at, pd, customers(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);

  return {
    href: "/eye-rx",
    stats: [stat("recentCount", data?.length || 0)],
    rows: (data || []).map((rx) => {
      const customer = Array.isArray(rx.customers) ? rx.customers[0] : rx.customers;
      return {
        id: rx.id as string,
        primary: (customer?.name as string | undefined) || "—",
        secondary: rx.created_at as string,
        meta: (rx.pd as string | null) || null,
      };
    }),
  };
};

const buildOpticalLab: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("optical_lab_orders")
    .select("id, frame_name, status, created_at, customers(name)")
    .eq("organization_id", orgId)
    .neq("status", "collected")
    .order("created_at", { ascending: true })
    .limit(50);

  const counts = countByStatus(data);

  return {
    href: "/lab-orders",
    stats: [
      stat("ordersPending", counts.get("pending") || 0),
      stat("ordersReady", counts.get("ready") || 0, (counts.get("ready") || 0) > 0 ? "good" : undefined),
    ],
    rows: (data || []).slice(0, ROW_LIMIT).map((order) => {
      const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
      return {
        id: order.id as string,
        primary: (customer?.name as string | undefined) || "—",
        secondary: (order.frame_name as string | null) || null,
        meta: String(order.status),
      };
    }),
  };
};

const buildBatchExpiry: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("product_batches")
    .select("id, lot_number, expiry_date, quantity, products(name)")
    .eq("organization_id", orgId)
    .not("expiry_date", "is", null)
    .lte("expiry_date", isoDate(daysFromNow(now, EXPIRY_WINDOW_DAYS)))
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true })
    .limit(50);

  const today = isoDate(now);
  const expired = (data || []).filter((batch) => String(batch.expiry_date) < today);

  return {
    href: "/batches",
    stats: [
      stat("expiringSoon", (data?.length || 0) - expired.length, data?.length ? "warn" : undefined),
      stat("expired", expired.length, expired.length > 0 ? "danger" : undefined),
    ],
    rows: (data || []).slice(0, ROW_LIMIT).map((batch) => {
      const product = Array.isArray(batch.products) ? batch.products[0] : batch.products;
      const isExpired = String(batch.expiry_date) < today;
      return {
        id: batch.id as string,
        primary: (product?.name as string | undefined) || "—",
        secondary: (batch.lot_number as string) || null,
        meta: String(batch.expiry_date),
        tone: isExpired ? ("danger" as const) : ("warn" as const),
      };
    }),
  };
};

const buildPetVaccinations: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("pet_vaccinations")
    .select("id, vaccine_name, due_on, pets(name)")
    .eq("organization_id", orgId)
    .not("due_on", "is", null)
    .lte("due_on", isoDate(daysFromNow(now, VACCINATION_WINDOW_DAYS)))
    .order("due_on", { ascending: true })
    .limit(50);

  const today = isoDate(now);
  const overdue = (data || []).filter((row) => String(row.due_on) < today);

  return {
    href: "/pets",
    stats: [
      stat("dueSoon", (data?.length || 0) - overdue.length),
      stat("overdue", overdue.length, overdue.length > 0 ? "danger" : undefined),
    ],
    rows: (data || []).slice(0, ROW_LIMIT).map((row) => {
      const pet = Array.isArray(row.pets) ? row.pets[0] : row.pets;
      return {
        id: row.id as string,
        primary: (pet?.name as string | undefined) || "—",
        secondary: (row.vaccine_name as string) || null,
        meta: String(row.due_on),
        tone: String(row.due_on) < today ? ("danger" as const) : ("warn" as const),
      };
    }),
  };
};

const buildSessionPackages: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("session_packages")
    .select("id, name, total_sessions, used_sessions, customers(name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  const active = (data || []).filter(
    (pkg) => Number(pkg.used_sessions) < Number(pkg.total_sessions)
  );
  const almostDone = active.filter(
    (pkg) => Number(pkg.total_sessions) - Number(pkg.used_sessions) <= 2
  );

  return {
    href: "/packages",
    stats: [
      stat("activePackages", active.length),
      stat("almostDone", almostDone.length, almostDone.length > 0 ? "warn" : undefined),
    ],
    rows: active.slice(0, ROW_LIMIT).map((pkg) => {
      const customer = Array.isArray(pkg.customers) ? pkg.customers[0] : pkg.customers;
      const left = Number(pkg.total_sessions) - Number(pkg.used_sessions);
      return {
        id: pkg.id as string,
        primary: (customer?.name as string | undefined) || "—",
        secondary: (pkg.name as string) || null,
        meta: `${left} / ${Number(pkg.total_sessions)}`,
        tone: left <= 2 ? ("warn" as const) : undefined,
      };
    }),
  };
};

const buildLabResults: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("lab_results")
    .select("id, test_name, status, created_at, customers(name)")
    .eq("organization_id", orgId)
    .neq("status", "released")
    .order("created_at", { ascending: true })
    .limit(50);

  const counts = countByStatus(data);

  return {
    href: "/lab-results",
    stats: [
      stat("resultsPending", counts.get("pending") || 0),
      stat("resultsReady", counts.get("ready") || 0, (counts.get("ready") || 0) > 0 ? "good" : undefined),
    ],
    rows: (data || []).slice(0, ROW_LIMIT).map((result) => {
      const customer = Array.isArray(result.customers) ? result.customers[0] : result.customers;
      return {
        id: result.id as string,
        primary: (customer?.name as string | undefined) || "—",
        secondary: (result.test_name as string) || null,
        meta: String(result.status),
      };
    }),
  };
};

const buildClasses: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("tuition_classes")
    .select("id, name, schedule, fee")
    .eq("organization_id", orgId)
    .order("name", { ascending: true })
    .limit(50);

  return {
    href: "/classes",
    stats: [stat("classesTotal", data?.length || 0)],
    rows: (data || []).slice(0, ROW_LIMIT).map((cls) => ({
      id: cls.id as string,
      primary: (cls.name as string) || "—",
      secondary: (cls.schedule as string | null) || null,
      meta: formatCurrency(Number(cls.fee || 0)),
    })),
  };
};

const buildAttendance: Builder = async ({ supabase, orgId, now }) => {
  const today = isoDate(now);
  const { data } = await supabase
    .from("tuition_attendance")
    .select("id, present, customers(name), tuition_classes(name)")
    .eq("organization_id", orgId)
    .eq("attended_on", today)
    .limit(300);

  const present = (data || []).filter((row) => row.present === true);
  const absent = (data || []).filter((row) => row.present === false);

  return {
    href: "/attendance",
    stats: [
      stat("presentToday", present.length, present.length > 0 ? "good" : undefined),
      stat("absentToday", absent.length, absent.length > 0 ? "warn" : undefined),
    ],
    rows: absent.slice(0, ROW_LIMIT).map((row) => {
      const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
      const cls = Array.isArray(row.tuition_classes) ? row.tuition_classes[0] : row.tuition_classes;
      return {
        id: row.id as string,
        primary: (customer?.name as string | undefined) || "—",
        secondary: (cls?.name as string | undefined) || null,
        tone: "warn" as const,
      };
    }),
  };
};

const buildGrading: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("tuition_submissions")
    .select("id, status, submitted_at, customers(name), tuition_assessments(title)")
    .eq("organization_id", orgId)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true })
    .limit(50);

  return {
    href: "/assessments",
    stats: [
      stat("awaitingGrading", data?.length || 0, (data?.length || 0) > 0 ? "warn" : undefined),
    ],
    rows: (data || []).slice(0, ROW_LIMIT).map((submission) => {
      const customer = Array.isArray(submission.customers)
        ? submission.customers[0]
        : submission.customers;
      const assessment = Array.isArray(submission.tuition_assessments)
        ? submission.tuition_assessments[0]
        : submission.tuition_assessments;
      return {
        id: submission.id as string,
        primary: (customer?.name as string | undefined) || "—",
        secondary: (assessment?.title as string | undefined) || null,
        meta: (submission.submitted_at as string | null) || null,
      };
    }),
  };
};

const buildMemberships: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("gym_memberships")
    .select("id, plan_name, ends_on, status, customers(name)")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .limit(500);

  const cutoff = isoDate(daysFromNow(now, MEMBERSHIP_WINDOW_DAYS));
  const expiring = (data || [])
    .filter((row) => row.ends_on && String(row.ends_on) <= cutoff)
    .sort((a, b) => String(a.ends_on).localeCompare(String(b.ends_on)));

  return {
    href: "/memberships",
    stats: [
      stat("activeMembers", data?.length || 0),
      stat("expiringMembers", expiring.length, expiring.length > 0 ? "warn" : undefined),
    ],
    rows: expiring.slice(0, ROW_LIMIT).map((row) => {
      const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
      return {
        id: row.id as string,
        primary: (customer?.name as string | undefined) || "—",
        secondary: (row.plan_name as string) || null,
        meta: String(row.ends_on),
        tone: "warn" as const,
      };
    }),
  };
};

const buildCheckins: Builder = async ({ supabase, orgId, todayStart, todayEnd }) => {
  const { data } = await supabase
    .from("gym_checkins")
    .select("id, checked_in_at, customers(name)")
    .eq("organization_id", orgId)
    .gte("checked_in_at", todayStart.toISOString())
    .lte("checked_in_at", todayEnd.toISOString())
    .order("checked_in_at", { ascending: false })
    .limit(100);

  return {
    href: "/checkins",
    stats: [stat("checkinsToday", data?.length || 0)],
    rows: (data || []).slice(0, ROW_LIMIT).map((row) => {
      const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
      return {
        id: row.id as string,
        primary: (customer?.name as string | undefined) || "—",
        meta: row.checked_in_at as string,
      };
    }),
  };
};

const buildTables: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("dining_tables")
    .select("id, name, seats, status")
    .eq("organization_id", orgId)
    .order("name", { ascending: true })
    .limit(100);

  const counts = countByStatus(data);
  const occupied = (data || []).filter((table) => table.status !== "free");

  return {
    href: "/tables",
    stats: [
      stat("tablesFree", counts.get("free") || 0, "good"),
      stat("tablesOccupied", occupied.length, occupied.length > 0 ? "warn" : undefined),
    ],
    rows: occupied.slice(0, ROW_LIMIT).map((table) => ({
      id: table.id as string,
      primary: (table.name as string) || "—",
      secondary: `${Number(table.seats || 0)}`,
      meta: String(table.status),
      tone: "warn" as const,
    })),
  };
};

const buildRooms: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("hotel_rooms")
    .select("id, room_number, room_type, status, rate")
    .eq("organization_id", orgId)
    .order("room_number", { ascending: true })
    .limit(200);

  const counts = countByStatus(data);

  return {
    href: "/rooms",
    stats: [
      stat("roomsVacant", counts.get("vacant") || 0, "good"),
      stat("roomsOccupied", counts.get("occupied") || 0),
      stat("roomsCleaning", counts.get("cleaning") || 0, (counts.get("cleaning") || 0) > 0 ? "warn" : undefined),
    ],
    rows: (data || [])
      .filter((room) => room.status !== "vacant")
      .slice(0, ROW_LIMIT)
      .map((room) => ({
        id: room.id as string,
        primary: (room.room_number as string) || "—",
        secondary: (room.room_type as string) || null,
        meta: String(room.status),
      })),
  };
};

const buildListings: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("property_listings")
    .select("id, title, status, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  const counts = countByStatus(data);
  const active = (data || []).filter((listing) => listing.status === "available");

  return {
    href: "/listings",
    stats: [
      stat("listingsActive", active.length),
      stat("listingsReserved", counts.get("reserved") || 0),
      stat("listingsSold", counts.get("sold") || 0, "good"),
    ],
    rows: active.slice(0, ROW_LIMIT).map((listing) => ({
      id: listing.id as string,
      primary: (listing.title as string) || "—",
      meta: String(listing.status),
    })),
  };
};

const buildShipments: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("courier_shipments")
    .select("id, tracking_no, status, created_at")
    .eq("organization_id", orgId)
    .neq("status", "delivered")
    .order("created_at", { ascending: true })
    .limit(100);

  const counts = countByStatus(data);

  return {
    href: "/shipments",
    stats: [
      stat("shipmentsOpen", data?.length || 0),
      stat("shipmentsInTransit", counts.get("in_transit") || 0),
    ],
    rows: (data || []).slice(0, ROW_LIMIT).map((shipment) => ({
      id: shipment.id as string,
      primary: (shipment.tracking_no as string) || "—",
      meta: String(shipment.status),
    })),
  };
};

const buildProjects: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("contractor_projects")
    .select("id, name, status, claim_amount, created_at")
    .eq("organization_id", orgId)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(100);

  const claims = (data || []).reduce((sum, project) => sum + Number(project.claim_amount || 0), 0);

  return {
    href: "/projects",
    stats: [
      stat("activeProjects", data?.length || 0),
      stat("claimsValue", formatCurrency(claims)),
    ],
    rows: (data || []).slice(0, ROW_LIMIT).map((project) => ({
      id: project.id as string,
      primary: (project.name as string) || "—",
      secondary: String(project.status),
      meta: formatCurrency(Number(project.claim_amount || 0)),
    })),
  };
};

const buildWorkOrders: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("manufacturing_orders")
    .select("id, name, status, created_at")
    .eq("organization_id", orgId)
    .neq("status", "done")
    .order("created_at", { ascending: true })
    .limit(100);

  const counts = countByStatus(data);

  return {
    href: "/work-orders",
    stats: [
      stat("ordersPlanned", counts.get("planned") || 0),
      stat("ordersInProgress", counts.get("in_progress") || 0),
    ],
    rows: (data || []).slice(0, ROW_LIMIT).map((order) => ({
      id: order.id as string,
      primary: (order.name as string) || "—",
      meta: String(order.status),
    })),
  };
};

const buildMatters: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("legal_matters")
    .select("id, title, status, created_at")
    .eq("organization_id", orgId)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(100);

  return {
    href: "/matters",
    stats: [stat("openMatters", data?.length || 0)],
    rows: (data || []).slice(0, ROW_LIMIT).map((matter) => ({
      id: matter.id as string,
      primary: (matter.title as string) || "—",
      meta: String(matter.status),
    })),
  };
};

const buildEvents: Builder = async ({ supabase, orgId, now }) => {
  const { data } = await supabase
    .from("event_plans")
    .select("id, title, event_date, status")
    .eq("organization_id", orgId)
    .gte("event_date", isoDate(now))
    .order("event_date", { ascending: true })
    .limit(50);

  const withinWeek = (data || []).filter(
    (event) => String(event.event_date) <= isoDate(daysFromNow(now, 7))
  );

  return {
    href: "/events",
    stats: [
      stat("upcomingEvents", data?.length || 0),
      stat("thisWeek", withinWeek.length, withinWeek.length > 0 ? "warn" : undefined),
    ],
    rows: (data || []).slice(0, ROW_LIMIT).map((event) => ({
      id: event.id as string,
      primary: (event.title as string) || "—",
      secondary: (event.event_date as string | null) || null,
      meta: String(event.status),
    })),
  };
};

const buildPlots: Builder = async ({ supabase, orgId }) => {
  const { data } = await supabase
    .from("farm_plots")
    .select("id, name, crop, status")
    .eq("organization_id", orgId)
    .order("name", { ascending: true })
    .limit(100);

  const counts = countByStatus(data);

  return {
    href: "/plots",
    stats: [
      stat("plotsPlanted", counts.get("planted") || 0, "good"),
      stat("plotsIdle", counts.get("idle") || 0),
    ],
    rows: (data || []).slice(0, ROW_LIMIT).map((plot) => ({
      id: plot.id as string,
      primary: (plot.name as string) || "—",
      secondary: (plot.crop as string | null) || null,
      meta: String(plot.status),
    })),
  };
};

const BUILDERS: Record<string, Builder> = {
  staffCashSession: buildCashSession,
  staffPosTickets: buildPosTickets,
  staffTables: buildTables,
  staffRooms: buildRooms,
  staffClasses: buildClasses,
  staffAttendance: buildAttendance,
  staffGrading: buildGrading,
  staffMemberships: buildMemberships,
  staffCheckins: buildCheckins,
  staffJobCards: buildJobCards,
  staffLaundry: buildLaundry,
  staffCommissions: buildCommissions,
  staffEyeRx: buildEyeRx,
  staffOpticalLab: buildOpticalLab,
  staffBatchExpiry: buildBatchExpiry,
  staffPetVaccinations: buildPetVaccinations,
  staffSessionPackages: buildSessionPackages,
  staffLabResults: buildLabResults,
  staffListings: buildListings,
  staffShipments: buildShipments,
  staffProjects: buildProjects,
  staffWorkOrders: buildWorkOrders,
  staffMatters: buildMatters,
  staffEvents: buildEvents,
  staffPlots: buildPlots,
  staffLowStock: buildLowStock,
};

/** Card ids the loader can actually fill. Used by the coverage test. */
export const NICHE_CARD_BUILDER_IDS = Object.keys(BUILDERS);

/**
 * Builds only the cards this niche is entitled to. A failing card is dropped rather
 * than allowed to break the dashboard, since none of these are transactional.
 */
export async function loadNicheCards({
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
  const { start: todayStart, end: todayEnd } = dayBoundsMY(now);
  const ctx: BuilderContext = { supabase, orgId, now, todayStart, todayEnd };

  const wanted = cardsFor(niche, "staff").filter(
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
