import { hasCapability } from "@/lib/niches";
import type { Organization } from "@/lib/types";
import { getOpsBrainSettings, isOpsBrainEnabled } from "./enabled";
import { hasRecentOpenAlert, insertAlert } from "./alerts";
import type { SupabaseClientLike } from "./types-internal";

type Ctx = {
  supabase: SupabaseClientLike;
  organization: Organization;
  actorId?: string | null;
};

/** Never throws to caller — all errors swallowed. */
export async function runOpsBrainAfterRefund(ctx: Ctx, meta: {
  invoiceId: string;
  refundInvoiceId?: string;
}): Promise<void> {
  try {
    if (!isOpsBrainEnabled(ctx.organization)) return;
    if (!hasCapability(ctx.organization.niche, "pos") && !hasCapability(ctx.organization.niche, "receipts")) {
      return;
    }
    await evaluateRefundVoidRates(ctx, "refund");
    await evaluateSuspiciousPattern(ctx, "refund", meta.invoiceId);
  } catch {
    /* never block */
  }
}

export async function runOpsBrainAfterVoid(ctx: Ctx, meta: {
  ticketId: string;
}): Promise<void> {
  try {
    if (!isOpsBrainEnabled(ctx.organization)) return;
    if (!hasCapability(ctx.organization.niche, "pos")) return;
    await evaluateRefundVoidRates(ctx, "void");
    await evaluateSuspiciousPattern(ctx, "void", meta.ticketId);
  } catch {
    /* never block */
  }
}

export async function runOpsBrainAfterCashClose(ctx: Ctx, meta: {
  sessionId: string;
  variance: number;
  expected: number;
  closingCount: number;
}): Promise<void> {
  try {
    if (!isOpsBrainEnabled(ctx.organization)) return;
    if (!hasCapability(ctx.organization.niche, "cash_drawer")) return;
    const settings = getOpsBrainSettings(ctx.organization);
    const absVar = Math.abs(meta.variance);
    const pct = meta.expected > 0 ? (absVar / meta.expected) * 100 : absVar > 0 ? 100 : 0;
    if (absVar < settings.cash_variance_rm && pct < settings.cash_variance_pct) return;

    const staffId = ctx.actorId || null;
    if (await hasRecentOpenAlert(ctx.supabase, ctx.organization.id, "cash_discrepancy", staffId, 12)) {
      return;
    }
    const severity = absVar >= settings.cash_variance_rm * 3 || pct >= 5 ? "high" : "medium";
    await insertAlert(ctx.supabase, {
      organizationId: ctx.organization.id,
      type: "cash_discrepancy",
      severity,
      title: "Cash discrepancy on session close",
      message: `Variance RM ${meta.variance.toFixed(2)} (expected ${meta.expected.toFixed(2)}, counted ${meta.closingCount.toFixed(2)}).`,
      relatedStaffId: staffId,
      relatedEntityType: "cash_session",
      relatedEntityId: meta.sessionId,
      metadata: { ...meta },
      escalate: severity === "high",
    });
  } catch {
    /* never block */
  }
}

export async function runOpsBrainAfterStockAdjust(ctx: Ctx, meta: {
  adjustmentId?: string;
  productId?: string | null;
  productName?: string;
  quantityDelta?: number;
  unitPrice?: number;
  movementType?: string;
  fromPosSale?: boolean;
}): Promise<void> {
  try {
    if (!isOpsBrainEnabled(ctx.organization)) return;
    if (!hasCapability(ctx.organization.niche, "inventory")) return;
    if (meta.fromPosSale || meta.movementType === "sale") return;

    const value = Math.abs(Number(meta.quantityDelta || 0) * Number(meta.unitPrice || 0));
    const severity = value >= 200 ? "high" : value >= 50 ? "medium" : "low";
    const staffId = ctx.actorId || null;
    const type = "stock_without_sale";
    if (await hasRecentOpenAlert(ctx.supabase, ctx.organization.id, type, staffId, 6)) return;

    await insertAlert(ctx.supabase, {
      organizationId: ctx.organization.id,
      type,
      severity,
      title: "Stock movement without sale",
      message: `${meta.productName || "Item"} adjusted/out without matching POS sale${
        value ? ` (≈ RM ${value.toFixed(2)})` : ""
      }.`,
      relatedStaffId: staffId,
      relatedEntityType: meta.adjustmentId ? "stock_adjustment" : "stock_movement",
      relatedEntityId: meta.adjustmentId || meta.productId || null,
      metadata: { ...meta },
      escalate: severity === "high",
    });
  } catch {
    /* never block */
  }
}

async function evaluateRefundVoidRates(ctx: Ctx, kind: "refund" | "void") {
  const settings = getOpsBrainSettings(ctx.organization);
  const staffId = ctx.actorId;
  if (!staffId) return;

  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const orgId = ctx.organization.id;

  // Transactions: paid invoices created by staff in 7d
  const { data: sales } = await ctx.supabase
    .from("invoices")
    .select("id")
    .eq("organization_id", orgId)
    .eq("created_by", staffId)
    .gte("created_at", since)
    .in("status", ["paid", "partial", "unpaid"]);

  const saleCount = sales?.length || 0;

  let eventCount = 0;
  if (kind === "refund") {
    const { data: refunds } = await ctx.supabase
      .from("invoices")
      .select("id")
      .eq("organization_id", orgId)
      .eq("created_by", staffId)
      .not("refund_of_invoice_id", "is", null)
      .gte("created_at", since);
    eventCount = refunds?.length || 0;
  } else {
    const { data: voids } = await ctx.supabase
      .from("pos_tickets")
      .select("id")
      .eq("organization_id", orgId)
      .eq("created_by", staffId)
      .eq("status", "void")
      .gte("updated_at", since);
    eventCount = voids?.length || 0;
  }

  const denom = Math.max(saleCount + eventCount, 1);
  const rate = (eventCount / denom) * 100;
  const threshold = kind === "refund" ? settings.refund_rate_pct : settings.void_rate_pct;
  if (eventCount < 2 || rate < threshold) return;

  const type = kind === "refund" ? "high_refund_rate" : "high_void_rate";
  if (await hasRecentOpenAlert(ctx.supabase, orgId, type, staffId, 24)) return;

  const severity = rate >= threshold * 1.5 ? "high" : "medium";
  await insertAlert(ctx.supabase, {
    organizationId: orgId,
    type,
    severity,
    title: kind === "refund" ? "High refund rate (7 days)" : "High void rate (7 days)",
    message: `Staff ${kind} rate ${rate.toFixed(1)}% (${eventCount} events / ${denom} related) exceeds ${threshold}%.`,
    relatedStaffId: staffId,
    metadata: { rate, eventCount, saleCount, threshold, kind },
    escalate: severity === "high",
  });
}

async function evaluateSuspiciousPattern(
  ctx: Ctx,
  kind: "refund" | "void",
  entityId: string
) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  const nearClose = hour >= 21 || hour < 7;
  if (!nearClose || !ctx.actorId) return;

  const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const { data: recent } = await ctx.supabase
    .from("activity_logs")
    .select("id")
    .eq("organization_id", ctx.organization.id)
    .eq("actor_id", ctx.actorId)
    .in("action", ["pos.void", "pos.refund", "retail.void", "retail.refund"])
    .gte("created_at", since)
    .limit(10);

  if ((recent?.length || 0) < 3) return;

  const type = "suspicious_pattern";
  if (await hasRecentOpenAlert(ctx.supabase, ctx.organization.id, type, ctx.actorId, 24)) {
    return;
  }

  await insertAlert(ctx.supabase, {
    organizationId: ctx.organization.id,
    type,
    severity: "medium",
    title: "Suspicious void/refund pattern",
    message: `Repeated ${kind} activity at odd hours (MYT ${hour}:00). Review recent activity.`,
    relatedStaffId: ctx.actorId,
    relatedEntityType: kind === "void" ? "pos_ticket" : "invoice",
    relatedEntityId: entityId,
    metadata: { kind, hour, recentCount: recent?.length || 0 },
  });
}
