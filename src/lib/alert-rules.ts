import type { SupabaseClient } from "@supabase/supabase-js";
import { createAlert } from "@/lib/alerts";
import { formatCurrency } from "@/lib/utils";

/**
 * Loss-prevention rule engine. Pure reads + createAlert writes, always behind the
 * org's ops_brain_enabled flag, and it never throws — a rule crash must never
 * reach the transactional action that triggered it.
 *
 * Alert text is written in the org's default locale at creation time.
 */

export type AlertSettings = {
  refundRatePercent: number;
  cashVarianceRm: number;
  stockLeakRm: number;
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  refundRatePercent: 8,
  cashVarianceRm: 20,
  stockLeakRm: 100,
};

const REFUND_RATE_WINDOW_DAYS = 7;
const REPEAT_WINDOW_HOURS = 4;
const REPEAT_MIN_EVENTS = 3;
const MIN_MISTAKES_FOR_RATE = 2;

const SALE_ACTIONS = ["invoice.create", "pos.checkout"];
const REFUND_ACTIONS = ["pos.refund", "invoice.revoke"];

type RuleContext = {
  supabase: SupabaseClient;
  orgId: string;
  staffId: string;
  staffName?: string | null;
};

type LoadedSettings = AlertSettings & { ms: boolean };

/**
 * Reads the flag + thresholds in one shot. Returns null when the Ops Brain is off
 * or the columns are missing, which silently disables every rule.
 */
async function loadSettings(
  supabase: SupabaseClient,
  orgId: string
): Promise<LoadedSettings | null> {
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("alert_settings, locale_default")
      .eq("id", orgId)
      .maybeSingle();
    if (error || !data) return null;
    const raw = (data.alert_settings || {}) as Record<string, unknown>;
    const num = (value: unknown, fallback: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    };
    return {
      refundRatePercent: num(raw.refund_rate_percent, DEFAULT_ALERT_SETTINGS.refundRatePercent),
      cashVarianceRm: num(raw.cash_variance_rm, DEFAULT_ALERT_SETTINGS.cashVarianceRm),
      stockLeakRm: num(raw.stock_leak_rm, DEFAULT_ALERT_SETTINGS.stockLeakRm),
      ms: String(data.locale_default || "").startsWith("ms"),
    };
  } catch {
    return null;
  }
}

/**
 * Rule writes go through the service role when available: a plain cashier
 * triggering a rule must still produce an alert even though alerts' write policy
 * is leadership-only. Without the key we fall back to the caller's client.
 */
async function ruleClient(fallback: SupabaseClient): Promise<SupabaseClient> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function name(ctx: RuleContext) {
  return ctx.staffName || "staff";
}

/** Fired after a refund or a POS void: rate check + short-window repeat check. */
export async function runAfterRefundOrVoid(ctx: RuleContext): Promise<void> {
  try {
    const settings = await loadSettings(ctx.supabase, ctx.orgId);
    if (!settings) return;
    const db = await ruleClient(ctx.supabase);
    const now = Date.now();

    const [logsRes, voidsRes, recentRes] = await Promise.all([
      db
        .from("activity_logs")
        .select("action, created_at")
        .eq("organization_id", ctx.orgId)
        .eq("actor_id", ctx.staffId)
        .in("action", [...SALE_ACTIONS, ...REFUND_ACTIONS])
        .gte("created_at", new Date(now - REFUND_RATE_WINDOW_DAYS * 86400000).toISOString())
        .limit(1000),
      db
        .from("pos_tickets")
        .select("id, created_at")
        .eq("organization_id", ctx.orgId)
        .eq("created_by", ctx.staffId)
        .eq("status", "void")
        .gte("created_at", new Date(now - REFUND_RATE_WINDOW_DAYS * 86400000).toISOString())
        .limit(500),
      db
        .from("activity_logs")
        .select("id")
        .eq("organization_id", ctx.orgId)
        .eq("actor_id", ctx.staffId)
        .in("action", REFUND_ACTIONS)
        .gte("created_at", new Date(now - REPEAT_WINDOW_HOURS * 3600000).toISOString())
        .limit(100),
    ]);

    const logs = logsRes.data || [];
    const sales = logs.filter((row) => SALE_ACTIONS.includes(String(row.action))).length;
    const refunds = logs.filter((row) => REFUND_ACTIONS.includes(String(row.action))).length;
    const voids = (voidsRes.data || []).length;
    const mistakes = refunds + voids;
    const rate = (mistakes / Math.max(1, sales)) * 100;

    if (mistakes >= MIN_MISTAKES_FOR_RATE && rate > settings.refundRatePercent) {
      const high = rate >= settings.refundRatePercent * 2;
      await createAlert(db, {
        organizationId: ctx.orgId,
        type: "refund_rate",
        severity: high ? "high" : "medium",
        title: settings.ms ? "Kadar refund/void melebihi had" : "Refund/void rate above limit",
        message: settings.ms
          ? `${name(ctx)} membatalkan ${mistakes} daripada ${Math.max(1, sales)} jualan dalam ${REFUND_RATE_WINDOW_DAYS} hari (${rate.toFixed(1)}%). Had ialah ${settings.refundRatePercent}%.`
          : `${name(ctx)} cancelled ${mistakes} of ${Math.max(1, sales)} sales in ${REFUND_RATE_WINDOW_DAYS} days (${rate.toFixed(1)}%). Limit is ${settings.refundRatePercent}%.`,
        relatedStaffId: ctx.staffId,
        metadata: { refunds, voids, sales, rate: Math.round(rate * 10) / 10 },
      });
    }

    // Same staff voiding/refunding repeatedly inside a few hours (closing-time trick).
    const recentVoids = (voidsRes.data || []).filter(
      (row) => new Date(String(row.created_at)).getTime() >= now - REPEAT_WINDOW_HOURS * 3600000
    ).length;
    const recentTotal = (recentRes.data || []).length + recentVoids;
    if (recentTotal >= REPEAT_MIN_EVENTS) {
      await createAlert(db, {
        organizationId: ctx.orgId,
        type: "repeat_voids",
        severity: "high",
        title: settings.ms ? "Pembatalan berulang dalam tempoh singkat" : "Repeated cancellations in a short window",
        message: settings.ms
          ? `${name(ctx)} merekod ${recentTotal} refund/void dalam ${REPEAT_WINDOW_HOURS} jam terakhir. Semak sebelum tutup shift.`
          : `${name(ctx)} recorded ${recentTotal} refunds/voids in the last ${REPEAT_WINDOW_HOURS} hours. Review before the shift closes.`,
        relatedStaffId: ctx.staffId,
        metadata: { events: recentTotal, windowHours: REPEAT_WINDOW_HOURS },
      });
    }
  } catch {
    // Never let a rule failure reach the till.
  }
}

/** Fired after a cash session closes: flag variances beyond the threshold. */
export async function runAfterCashClose({
  supabase,
  orgId,
  staffId,
  staffName,
  sessionId,
  variance,
}: RuleContext & { sessionId: string; variance: number }): Promise<void> {
  try {
    const settings = await loadSettings(supabase, orgId);
    if (!settings) return;
    const gap = Math.abs(variance);
    if (gap <= settings.cashVarianceRm) return;

    const db = await ruleClient(supabase);
    const short = variance < 0;
    await createAlert(db, {
      organizationId: orgId,
      type: "cash_variance",
      severity: gap >= settings.cashVarianceRm * 3 ? "high" : "medium",
      title: settings.ms
        ? short
          ? "Laci tunai kurang semasa tutup"
          : "Laci tunai lebih semasa tutup"
        : short
          ? "Cash drawer short at close"
          : "Cash drawer over at close",
      message: settings.ms
        ? `Sesi ditutup oleh ${staffName || "staff"} dengan beza ${formatCurrency(variance)}. Had ialah ${formatCurrency(settings.cashVarianceRm)}.`
        : `Session closed by ${staffName || "staff"} with a variance of ${formatCurrency(variance)}. Limit is ${formatCurrency(settings.cashVarianceRm)}.`,
      relatedStaffId: staffId,
      relatedEntityType: "cash_session",
      relatedEntityId: sessionId,
      metadata: { variance },
    });
  } catch {
    // Never let a rule failure reach the till.
  }
}

/** Fired after manual stock out/adjust: flag value leaving without a sale. */
export async function runAfterStockAdjust({
  supabase,
  orgId,
  staffId,
  staffName,
  items,
}: RuleContext & {
  items: { productId?: string; name: string; qty: number; unitPrice: number }[];
}): Promise<void> {
  try {
    const settings = await loadSettings(supabase, orgId);
    if (!settings) return;

    const valued = items
      .map((item) => ({ ...item, value: item.qty * item.unitPrice }))
      .filter((item) => item.qty > 0);
    const totalValue = valued.reduce((sum, item) => sum + item.value, 0);
    if (totalValue < settings.stockLeakRm) return;

    const db = await ruleClient(supabase);
    const top = [...valued].sort((a, b) => b.value - a.value)[0];
    const summary =
      valued.length === 1 && top
        ? `${top.qty} × ${top.name}`
        : `${valued.length} item (${top ? `${top.name} + ${valued.length - 1} lagi` : ""})`;
    const summaryEn =
      valued.length === 1 && top
        ? `${top.qty} × ${top.name}`
        : `${valued.length} items (${top ? `${top.name} + ${valued.length - 1} more` : ""})`;

    await createAlert(db, {
      organizationId: orgId,
      type: "stock_leak",
      severity: totalValue >= settings.stockLeakRm * 3 ? "high" : "medium",
      title: settings.ms ? "Stok keluar tanpa jualan" : "Stock reduced without a sale",
      message: settings.ms
        ? `${summary} bernilai ${formatCurrency(totalValue)} dipelaraskan keluar oleh ${staffName || "staff"} tanpa jualan sepadan.`
        : `${summaryEn} worth ${formatCurrency(totalValue)} was adjusted out by ${staffName || "staff"} with no matching sale.`,
      relatedStaffId: staffId,
      relatedEntityType: valued.length === 1 ? "product" : null,
      relatedEntityId: valued.length === 1 ? valued[0].productId ?? null : null,
      metadata: { value: Math.round(totalValue * 100) / 100, items: valued.length },
    });
  } catch {
    // Never let a rule failure reach the till.
  }
}
