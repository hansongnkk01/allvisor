import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { upsertProductAction } from "@/app/actions";
import { InventoryStockTable } from "@/components/InventoryStockTable";
import { InventoryBarcodeInput } from "@/components/InventoryBarcodeInput";
import { FrequentlyUsedStock } from "@/components/FrequentlyUsedStock";
import { SectionActivityLog } from "@/components/SectionActivityLog";
import { fetchSectionLogs } from "@/lib/section-logs";

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Inventory");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [{ data: productsRaw, error: productsError }, { data: movements }, logs] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, sku, barcode, unit_price, quantity, low_stock_threshold, created_at"
        )
        .eq("organization_id", ctx.organization.id)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("stock_movements")
        .select("product_id, quantity, products(id, name, sku, quantity)")
        .eq("organization_id", ctx.organization.id)
        .in("type", ["out", "sale"])
        .gte("created_at", since.toISOString())
        .limit(3000),
      fetchSectionLogs(ctx.organization.id, ["inventory"], 25),
    ]);

  let products = productsRaw;
  if (productsError && /barcode/i.test(productsError.message)) {
    const fallback = await supabase
      .from("products")
      .select(
        "id, name, sku, unit_price, quantity, low_stock_threshold, created_at"
      )
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(500);
    products = (fallback.data || []).map((p) => ({ ...p, barcode: null }));
  }

  const usage = new Map<
    string,
    { id: string; name: string; sku: string | null; quantity: number; usedQty: number }
  >();
  for (const m of movements || []) {
    const pid = m.product_id as string;
    if (!pid) continue;
    const prodRaw = Array.isArray(m.products) ? m.products[0] : m.products;
    const prod = prodRaw as
      | { id: string; name: string; sku?: string | null; quantity?: number }
      | null;
    if (!prod?.id) continue;
    const prev = usage.get(pid);
    const add = Number(m.quantity) || 0;
    if (prev) {
      prev.usedQty += add;
    } else {
      usage.set(pid, {
        id: prod.id,
        name: prod.name,
        sku: prod.sku || null,
        quantity: Number(prod.quantity || 0),
        usedQty: add,
      });
    }
  }
  const frequentItems = [...usage.values()]
    .sort((a, b) => b.usedQty - a.usedQty)
    .slice(0, 12);

  const isClinic = ctx.organization.niche === "clinic";

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title={t("title")}
        subtitle={isClinic ? t("clinicSubtitle") : t("retailSubtitle")}
      />

      <FrequentlyUsedStock
        title={t("frequentlyUsed")}
        hint={t("frequentlyUsedHint")}
        items={frequentItems}
        usedLabel={t("usedTimes")}
        onHandLabel={t("onHand")}
        empty={t("empty")}
      />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("add")}</h3>
        <ActionForm action={upsertProductAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("name")}</label>
              <input
                name="name"
                required
                className="input"
                placeholder={isClinic ? "Paracetamol 500mg" : undefined}
              />
            </div>
            <div className="field">
              <label>{t("sku")}</label>
              <input name="sku" className="input" />
            </div>
            <InventoryBarcodeInput label={t("barcode")} placeholder={t("barcodeHint")} />
            <div className="field">
              <label>{t("price")}</label>
              <input name="unit_price" type="number" step="0.01" defaultValue={0} className="input" />
            </div>
            <div className="field">
              <label>{t("cost")}</label>
              <input name="cost_price" type="number" step="0.01" defaultValue={0} className="input" />
            </div>
            <div className="field">
              <label>{t("qty")}</label>
              <input name="quantity" type="number" defaultValue={0} className="input" />
            </div>
            <div className="field">
              <label>{t("lowStock")}</label>
              <input name="low_stock_threshold" type="number" defaultValue={5} className="input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("save")}
          </button>
        </ActionForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <InventoryStockTable
          products={(products || []).map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: (p as { barcode?: string | null }).barcode ?? null,
            unit_price: Number(p.unit_price),
            quantity: p.quantity,
            low_stock_threshold: p.low_stock_threshold,
            created_at: p.created_at,
          }))}
          labels={{
            name: t("name"),
            sku: t("sku"),
            barcode: t("barcode"),
            price: t("price"),
            qty: t("qty"),
            addedAt: t("addedAt"),
            adjust: t("adjust"),
            empty: t("empty"),
            selectAll: t("selectAll"),
            selectItem: t("selectItem"),
            okSelected: t("okSelected"),
          }}
        />
      </div>

      <SectionActivityLog title={t("activity")} logs={logs} pageSize={5} />
    </div>
  );
}
