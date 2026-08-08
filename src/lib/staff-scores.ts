import { dayBoundsMY, formatDayKeyMY } from "@/lib/datetime-my";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Rule-based daily scoring. Deliberately transparent: every input is stored next
 * to the score so an owner can show a staff member exactly why the number moved.
 */

/** Accepts both the request-scoped server client and the service-role client. */
type MinimalSupabase = Pick<SupabaseClient, "from">;

type ActivityLogRow = {
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
};
type TicketStatusRow = { created_by: string | null; status: string };
type InvoiceTotalRow = { id: string; total: number | string | null };

/** Actions that mean "this person closed a sale". */
const SALE_ACTIONS = new Set(["invoice.create", "pos.checkout"]);
const REFUND_ACTIONS = new Set(["pos.refund", "invoice.revoke"]);

export const SCORE_WEIGHTS = {
  sales: 40,
  transactions: 20,
  basket: 15,
  activity: 10,
  cleanWork: 15,
} as const;

export type StaffScoreRow = {
  organization_id: string;
  user_id: string;
  score_date: string;
  sales_amount: number;
  transaction_count: number;
  average_basket: number;
  refund_count: number;
  void_count: number;
  refund_rate: number;
  void_rate: number;
  activity_count: number;
  score: number;
};

function share(value: number, best: number) {
  if (best <= 0) return 0;
  return Math.min(1, value / best);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Builds one row per member who did anything that day. Scores are relative to the
 * best performer of the same day, so a quiet Monday does not punish everybody.
 */
export async function computeStaffScores({
  supabase,
  orgId,
  day = formatDayKeyMY(),
}: {
  supabase: MinimalSupabase;
  orgId: string;
  day?: string;
}): Promise<StaffScoreRow[]> {
  const { start, end } = dayBoundsMY(new Date(`${day}T12:00:00+08:00`));

  const [{ data: logs }, { data: tickets }] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("actor_id, action, entity_type, entity_id")
      .eq("organization_id", orgId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .limit(5000),
    supabase
      .from("pos_tickets")
      .select("created_by, status")
      .eq("organization_id", orgId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .limit(5000),
  ]);

  const rows = ((logs || []) as ActivityLogRow[]).filter((log) => log.actor_id);
  if (!rows.length && !(tickets || []).length) return [];

  const saleInvoiceIds = [
    ...new Set(
      rows
        .filter((log) => SALE_ACTIONS.has(log.action) && log.entity_type === "invoice")
        .map((log) => String(log.entity_id))
        .filter(Boolean)
    ),
  ];

  const { data: invoices } = saleInvoiceIds.length
    ? await supabase
        .from("invoices")
        .select("id, total")
        .eq("organization_id", orgId)
        .in("id", saleInvoiceIds)
    : { data: [] as InvoiceTotalRow[] };

  const totalByInvoice = new Map<string, number>(
    ((invoices || []) as InvoiceTotalRow[]).map((inv) => [String(inv.id), Number(inv.total || 0)])
  );

  type Bucket = {
    sales: number;
    transactions: number;
    refunds: number;
    voids: number;
    activity: number;
  };
  const byUser = new Map<string, Bucket>();
  const bucket = (userId: string) => {
    const existing = byUser.get(userId);
    if (existing) return existing;
    const fresh: Bucket = { sales: 0, transactions: 0, refunds: 0, voids: 0, activity: 0 };
    byUser.set(userId, fresh);
    return fresh;
  };

  for (const log of rows) {
    const entry = bucket(String(log.actor_id));
    entry.activity += 1;
    if (SALE_ACTIONS.has(log.action) && log.entity_type === "invoice") {
      entry.transactions += 1;
      entry.sales += totalByInvoice.get(String(log.entity_id)) || 0;
    }
    if (REFUND_ACTIONS.has(log.action)) entry.refunds += 1;
  }

  for (const ticket of (tickets || []) as TicketStatusRow[]) {
    if (!ticket.created_by || ticket.status !== "void") continue;
    bucket(String(ticket.created_by)).voids += 1;
  }

  const buckets = [...byUser.entries()];
  const bestSales = Math.max(0, ...buckets.map(([, b]) => b.sales));
  const bestTransactions = Math.max(0, ...buckets.map(([, b]) => b.transactions));
  const bestActivity = Math.max(0, ...buckets.map(([, b]) => b.activity));
  const bestBasket = Math.max(
    0,
    ...buckets.map(([, b]) => (b.transactions > 0 ? b.sales / b.transactions : 0))
  );

  return buckets.map(([userId, entry]) => {
    const basket = entry.transactions > 0 ? entry.sales / entry.transactions : 0;
    const denominator = Math.max(1, entry.transactions);
    const refundRate = (entry.refunds / denominator) * 100;
    const voidRate = (entry.voids / denominator) * 100;

    // Mistakes eat into a fixed slice rather than the whole score.
    const penalty = Math.min(1, (refundRate + voidRate) / 20);
    const score =
      share(entry.sales, bestSales) * SCORE_WEIGHTS.sales +
      share(entry.transactions, bestTransactions) * SCORE_WEIGHTS.transactions +
      share(basket, bestBasket) * SCORE_WEIGHTS.basket +
      share(entry.activity, bestActivity) * SCORE_WEIGHTS.activity +
      (1 - penalty) * SCORE_WEIGHTS.cleanWork;

    return {
      organization_id: orgId,
      user_id: userId,
      score_date: day,
      sales_amount: round2(entry.sales),
      transaction_count: entry.transactions,
      average_basket: round2(basket),
      refund_count: entry.refunds,
      void_count: entry.voids,
      refund_rate: round2(refundRate),
      void_rate: round2(voidRate),
      activity_count: entry.activity,
      score: round2(score),
    };
  });
}

/** Writes the day's rows, replacing anything already stored for that date. */
export async function saveStaffScores(supabase: MinimalSupabase, rows: StaffScoreRow[]) {
  if (!rows.length) return { saved: 0 };
  const { error } = await supabase
    .from("staff_scores")
    .upsert(rows.map((row) => ({ ...row, computed_at: new Date().toISOString() })), {
      onConflict: "organization_id,user_id,score_date",
    });
  if (error) return { saved: 0, error: error.message };
  return { saved: rows.length };
}
