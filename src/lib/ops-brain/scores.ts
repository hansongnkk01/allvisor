import type { SupabaseClientLike } from "./types-internal";

function scoreFormula(input: {
  salesAmount: number;
  transactionCount: number;
  averageBasket: number;
  refundRate: number;
  voidRate: number;
}): number {
  const salesPart = Math.min(40, input.salesAmount / 100);
  const txnPart = Math.min(25, input.transactionCount * 2);
  const basketPart = Math.min(15, input.averageBasket / 20);
  const refundPenalty = Math.min(25, input.refundRate * 1.5);
  const voidPenalty = Math.min(20, input.voidRate * 1.5);
  return Math.max(0, Math.round((salesPart + txnPart + basketPart - refundPenalty - voidPenalty) * 10) / 10);
}

/** Recompute today's staff_scores for an org. Safe to call repeatedly. */
export async function recomputeStaffScoresForDate(
  supabase: SupabaseClientLike,
  organizationId: string,
  scoreDate: string
): Promise<{ error?: string; count?: number }> {
  try {
    const dayStart = `${scoreDate}T00:00:00+08:00`;
    const dayEnd = `${scoreDate}T23:59:59.999+08:00`;

    const { data: members } = await supabase
      .from("memberships")
      .select("user_id")
      .eq("organization_id", organizationId);

    const userIds = (members || []).map((m: { user_id: string }) => m.user_id).filter(Boolean);
    let count = 0;

    for (const userId of userIds) {
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, total, refund_of_invoice_id, status")
        .eq("organization_id", organizationId)
        .eq("created_by", userId)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      const sales = (invoices || []).filter(
        (i: { refund_of_invoice_id?: string | null; status?: string }) =>
          !i.refund_of_invoice_id && i.status !== "void"
      );
      const refunds = (invoices || []).filter(
        (i: { refund_of_invoice_id?: string | null }) => i.refund_of_invoice_id
      );

      const { data: voids } = await supabase
        .from("pos_tickets")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("created_by", userId)
        .eq("status", "void")
        .gte("updated_at", dayStart)
        .lte("updated_at", dayEnd);

      const salesAmount = sales.reduce(
        (s: number, i: { total?: number }) => s + Number(i.total || 0),
        0
      );
      const transactionCount = sales.length;
      const refundCount = refunds.length;
      const voidCount = voids?.length || 0;
      const denom = Math.max(transactionCount + refundCount + voidCount, 1);
      const refundRate = (refundCount / denom) * 100;
      const voidRate = (voidCount / denom) * 100;
      const averageBasket = transactionCount ? salesAmount / transactionCount : 0;
      const score = scoreFormula({
        salesAmount,
        transactionCount,
        averageBasket,
        refundRate,
        voidRate,
      });

      const { error } = await supabase.from("staff_scores").upsert(
        {
          organization_id: organizationId,
          user_id: userId,
          score_date: scoreDate,
          sales_amount: salesAmount,
          transaction_count: transactionCount,
          refund_count: refundCount,
          void_count: voidCount,
          refund_rate: refundRate,
          void_rate: voidRate,
          average_basket: averageBasket,
          score,
          updated_at: new Date().toISOString(),
          notes: null,
          metadata: {},
        },
        { onConflict: "organization_id,user_id,score_date" }
      );
      if (!error) count += 1;
    }

    return { count };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "score recompute failed" };
  }
}
