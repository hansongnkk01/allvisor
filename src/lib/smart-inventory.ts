import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Smart inventory (Ops Brain phase 4). Reorder suggestions and dead stock are
 * computed at load time from stock_movements + products — no extra tables.
 * Returns null on any failure so the sections simply do not render.
 */

const VELOCITY_DAYS = 30;
const LEAD_TIME_DAYS = 7;
const SAFETY_FACTOR = 1.2;
const MAX_ROWS = 10;

export type ReorderSuggestion = {
  productId: string;
  name: string;
  onHand: number;
  /** Units sold per day over the velocity window. */
  perDay: number;
  suggestedQty: number;
};

export type DeadStockItem = {
  productId: string;
  name: string;
  onHand: number;
  value: number;
};

export type SmartInventory = {
  reorder: ReorderSuggestion[];
  deadStock: DeadStockItem[];
};

export async function computeSmartInventory(
  supabase: SupabaseClient,
  orgId: string,
  now: Date
): Promise<SmartInventory | null> {
  try {
    const since = new Date(now.getTime() - VELOCITY_DAYS * 86400000).toISOString();
    const [productsRes, movementsRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, quantity, unit_price, created_at, track_stock")
        .eq("organization_id", orgId)
        .limit(1000),
      supabase
        .from("stock_movements")
        .select("product_id, quantity")
        .eq("organization_id", orgId)
        .eq("type", "sale")
        .gte("created_at", since)
        .limit(5000),
    ]);
    if (productsRes.error || movementsRes.error) return null;

    const sold = new Map<string, number>();
    for (const row of movementsRes.data || []) {
      const pid = row.product_id as string | null;
      if (!pid) continue;
      sold.set(pid, (sold.get(pid) || 0) + Number(row.quantity || 0));
    }

    const cutoffNew = now.getTime() - VELOCITY_DAYS * 86400000;
    const reorder: ReorderSuggestion[] = [];
    const deadStock: DeadStockItem[] = [];

    for (const product of productsRes.data || []) {
      if (product.track_stock === false) continue;
      const id = String(product.id);
      const onHand = Number(product.quantity || 0);
      const price = Number(product.unit_price || 0);
      const soldQty = sold.get(id) || 0;
      const perDay = soldQty / VELOCITY_DAYS;

      if (soldQty > 0) {
        // Reorder point: what we sell during the lead time. Suggest enough to
        // cover lead time plus safety stock, minus what is on the shelf.
        const target = perDay * LEAD_TIME_DAYS * SAFETY_FACTOR;
        if (onHand <= perDay * LEAD_TIME_DAYS && target - onHand > 0) {
          reorder.push({
            productId: id,
            name: String(product.name || "").trim() || "Item",
            onHand,
            perDay: Math.round(perDay * 100) / 100,
            suggestedQty: Math.ceil(target - onHand),
          });
        }
      } else if (onHand > 0 && new Date(String(product.created_at)).getTime() < cutoffNew) {
        // Nothing sold in the window and the product is not new: dead stock.
        deadStock.push({
          productId: id,
          name: String(product.name || "").trim() || "Item",
          onHand,
          value: Math.round(onHand * price * 100) / 100,
        });
      }
    }

    reorder.sort((a, b) => b.perDay - a.perDay);
    deadStock.sort((a, b) => b.value - a.value);
    return {
      reorder: reorder.slice(0, MAX_ROWS),
      deadStock: deadStock.slice(0, MAX_ROWS),
    };
  } catch {
    return null;
  }
}

/** Value-weighted random pick of up to `count` SKUs for a cycle count. */
export function pickCycleCountSkus<
  T extends { id: string; quantity: number; unit_price: number },
>(products: T[], count: number): T[] {
  const pool = products.filter(
    (product) => Number(product.quantity) > 0
  );
  const picked: T[] = [];
  const weights = pool.map((product) =>
    Math.max(1, Number(product.quantity) * Math.max(0.01, Number(product.unit_price)))
  );
  while (picked.length < count && pool.length > 0) {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * total;
    let index = 0;
    while (index < weights.length - 1 && roll > weights[index]) {
      roll -= weights[index];
      index += 1;
    }
    picked.push(pool[index]);
    pool.splice(index, 1);
    weights.splice(index, 1);
  }
  return picked;
}
