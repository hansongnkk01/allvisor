import { getOpsBrainSettings } from "./enabled";
import { hasRecentOpenAlert, insertAlert } from "./alerts";
import type { Organization } from "@/lib/types";
import type { SupabaseClientLike } from "./types-internal";

/** Scan products for reorder / dead stock and create alerts (non-blocking). */
export async function runSmartInventoryScan(
  supabase: SupabaseClientLike,
  organization: Organization
): Promise<{ created: number; error?: string }> {
  try {
    const settings = getOpsBrainSettings(organization);
    const orgId = organization.id;
    const sinceVelocity = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const deadSince = new Date(
      Date.now() - settings.dead_stock_days * 24 * 3600 * 1000
    ).toISOString();

    const { data: products } = await supabase
      .from("products")
      .select("id, name, quantity, low_stock_threshold, unit_price")
      .eq("organization_id", orgId)
      .limit(500);

    let created = 0;
    for (const p of products || []) {
      const productId = p.id as string;
      const qty = Number(p.quantity || 0);
      const name = String(p.name || "Item");

      const { data: movements } = await supabase
        .from("stock_movements")
        .select("quantity, type, created_at")
        .eq("organization_id", orgId)
        .eq("product_id", productId)
        .gte("created_at", sinceVelocity)
        .in("type", ["sale", "out"]);

      const unitsSold = (movements || []).reduce(
        (s: number, m: { quantity?: number }) => s + Math.abs(Number(m.quantity || 0)),
        0
      );
      const avgDaily = unitsSold / 14;
      const reorderPoint =
        avgDaily * settings.lead_time_days + avgDaily * settings.safety_stock_days;

      if (avgDaily > 0 && qty < reorderPoint) {
        if (!(await hasRecentOpenAlert(supabase, orgId, "reorder_suggestion", null, 48))) {
          // use metadata product filter via entity id; duplicate check per product
          const { data: existing } = await supabase
            .from("alerts")
            .select("id")
            .eq("organization_id", orgId)
            .eq("type", "reorder_suggestion")
            .eq("related_entity_id", productId)
            .in("status", ["open", "investigating"])
            .limit(1)
            .maybeSingle();
          if (!existing?.id) {
            const r = await insertAlert(supabase, {
              organizationId: orgId,
              type: "reorder_suggestion",
              severity: qty <= Number(p.low_stock_threshold || 0) ? "medium" : "low",
              title: `Reorder: ${name}`,
              message: `Stock ${qty} below reorder point ${reorderPoint.toFixed(1)} (avg ${avgDaily.toFixed(2)}/day).`,
              relatedEntityType: "product",
              relatedEntityId: productId,
              metadata: { qty, avgDaily, reorderPoint },
            });
            if (r.id) created += 1;
          }
        }
      }

      const { data: anyMove } = await supabase
        .from("stock_movements")
        .select("id")
        .eq("organization_id", orgId)
        .eq("product_id", productId)
        .gte("created_at", deadSince)
        .limit(1)
        .maybeSingle();

      if (!anyMove?.id && qty > 0) {
        const { data: existingDead } = await supabase
          .from("alerts")
          .select("id")
          .eq("organization_id", orgId)
          .eq("type", "dead_stock")
          .eq("related_entity_id", productId)
          .in("status", ["open", "investigating"])
          .limit(1)
          .maybeSingle();
        if (!existingDead?.id) {
          const r = await insertAlert(supabase, {
            organizationId: orgId,
            type: "dead_stock",
            severity: "low",
            title: `Dead stock: ${name}`,
            message: `No movement for ${settings.dead_stock_days}+ days (qty ${qty}).`,
            relatedEntityType: "product",
            relatedEntityId: productId,
            metadata: { qty, dead_stock_days: settings.dead_stock_days },
          });
          if (r.id) created += 1;
        }
      }
    }

    return { created };
  } catch (e) {
    return { created: 0, error: e instanceof Error ? e.message : "inventory scan failed" };
  }
}

/** Pick a short list of SKUs for cycle count (highest value or low stock). */
export async function pickCycleCountSkus(
  supabase: SupabaseClientLike,
  organizationId: string,
  limit = 8
): Promise<Array<{ id: string; name: string; quantity: number; unit_price: number }>> {
  const { data } = await supabase
    .from("products")
    .select("id, name, quantity, unit_price, low_stock_threshold")
    .eq("organization_id", organizationId)
    .order("quantity", { ascending: true })
    .limit(limit);
  return (data || []).map((p: {
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
  }) => ({
    id: p.id,
    name: p.name,
    quantity: Number(p.quantity || 0),
    unit_price: Number(p.unit_price || 0),
  }));
}
