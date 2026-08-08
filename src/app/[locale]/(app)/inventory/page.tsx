import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { hasCapability, vocabLabels } from "@/lib/niches";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { upsertProductAction } from "@/app/actions";
import { startCycleCountAction, submitCycleCountAction } from "@/app/ops-actions";
import { computeSmartInventory } from "@/lib/smart-inventory";
import { formatCurrency } from "@/lib/utils";
import { InventoryStockTable } from "@/components/InventoryStockTable";
import { InventoryHidProvider } from "@/components/InventoryHidProvider";
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
  if (!hasCapability(ctx.organization.niche, "inventory")) {
    redirect({ href: "/dashboard", locale });
  }
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [{ data: productsRaw, error: productsError }, { data: movements }, { data: categories }, logs] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, sku, barcode, unit_price, quantity, low_stock_threshold, created_at, sold_by, available_to_sale, track_stock, image_url, price_on_sale, category_id"
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
      supabase
        .from("product_categories")
        .select("id, name, parent_id")
        .eq("organization_id", ctx.organization.id)
        .order("name"),
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
    products = (fallback.data || []).map((p) => ({
      ...p,
      barcode: null,
      sold_by: "each",
      available_to_sale: true,
      track_stock: true,
      image_url: null,
      price_on_sale: false,
      category_id: null,
    }));
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

  const V = vocabLabels(ctx.organization.niche, locale);
  const isCommerce = hasCapability(ctx.organization.niche, "pos");

  // Ops Brain smart-inventory slices. Everything soft-fails: a pending
  // migration hides the sections instead of breaking the stock page.
  // The AI supervisor is always on for every organisation.
  const opsBrainEnabled = true;

  type CountRow = {
    id: string;
    product_id: string;
    expected_qty: number;
    counted_qty: number | null;
    status: "pending" | "submitted";
    created_at: string;
    products?: { name?: string | null } | { name?: string | null }[] | null;
  };
  const countName = (row: CountRow) => {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    return String(product?.name || "Item");
  };

  let smart: Awaited<ReturnType<typeof computeSmartInventory>> = null;
  let pendingCounts: CountRow[] = [];
  let recentCounts: CountRow[] = [];
  if (opsBrainEnabled) {
    smart = await computeSmartInventory(supabase, ctx.organization.id, new Date());
    try {
      const { data: countRows, error: countError } = await supabase
        .from("stock_counts")
        .select("id, product_id, expected_qty, counted_qty, status, created_at, products(name)")
        .eq("organization_id", ctx.organization.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!countError) {
        const all = (countRows || []) as CountRow[];
        pendingCounts = all.filter((row) => row.status === "pending");
        recentCounts = all.filter((row) => row.status === "submitted").slice(0, 5);
      }
    } catch {
      pendingCounts = [];
    }
  }

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title={t("title")}
        subtitle={V.inventorySubtitle}
      />

      {opsBrainEnabled && smart ? (
        <div className="fluid-grid">
          <section className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>{t("smartReorderTitle")}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: "0.82rem" }}>
              {t("smartReorderHint")}
            </p>
            {smart.reorder.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                {t("smartReorderEmpty")}
              </p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("name")}</th>
                    <th>{t("smartOnHand")}</th>
                    <th>{t("smartPerDay")}</th>
                    <th>{t("smartOrderQty")}</th>
                  </tr>
                </thead>
                <tbody>
                  {smart.reorder.map((row) => (
                    <tr key={row.productId}>
                      <td>{row.name}</td>
                      <td>{row.onHand}</td>
                      <td>{row.perDay}</td>
                      <td>
                        <strong>{row.suggestedQty}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>{t("smartDeadTitle")}</h3>
            <p className="muted" style={{ marginTop: 0, fontSize: "0.82rem" }}>
              {t("smartDeadHint")}
            </p>
            {smart.deadStock.length === 0 ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                {t("smartDeadEmpty")}
              </p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("name")}</th>
                    <th>{t("smartOnHand")}</th>
                    <th>{t("smartDeadValue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {smart.deadStock.map((row) => (
                    <tr key={row.productId}>
                      <td>{row.name}</td>
                      <td>{row.onHand}</td>
                      <td>{formatCurrency(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      ) : null}

      {opsBrainEnabled ? (
        <section className="surface" style={{ padding: "1.25rem" }}>
          <div
            className="row"
            style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}
          >
            <div style={{ maxWidth: 560 }}>
              <h3 style={{ margin: 0 }}>{t("cycleTitle")}</h3>
              <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.82rem" }}>
                {t("cycleHint")}
              </p>
            </div>
            <ActionForm action={startCycleCountAction}>
              <button type="submit" className="btn btn-soft">
                {t("cycleStart")}
              </button>
            </ActionForm>
          </div>

          {pendingCounts.length === 0 ? (
            <p className="muted" style={{ marginBottom: 0 }}>{t("cyclePendingEmpty")}</p>
          ) : (
            <div className="stack" style={{ gap: "0.45rem", marginTop: "0.75rem" }}>
              {pendingCounts.map((row) => (
                <ActionForm
                  key={row.id}
                  action={submitCycleCountAction}
                  className="row"
                  style={{ gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}
                >
                  <input type="hidden" name="count_id" value={row.id} />
                  <strong style={{ flex: 1, minWidth: 140 }}>{countName(row)}</strong>
                  <span className="muted" style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                    {t("cycleExpected")}: {row.expected_qty}
                  </span>
                  <input
                    name="counted_qty"
                    type="number"
                    min={0}
                    step="any"
                    required
                    defaultValue={row.expected_qty}
                    className="input"
                    style={{ width: 110 }}
                    aria-label={t("cycleCounted")}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: "0.35rem 0.8rem" }}>
                    {t("cycleSubmit")}
                  </button>
                </ActionForm>
              ))}
            </div>
          )}

          {recentCounts.length > 0 ? (
            <div style={{ marginTop: "0.9rem" }}>
              <div className="muted" style={{ fontSize: "0.78rem", marginBottom: "0.3rem" }}>
                {t("cycleRecentDone")}
              </div>
              <div className="stack" style={{ gap: "0.25rem" }}>
                {recentCounts.map((row) => {
                  const diff = Math.round((Number(row.counted_qty) - Number(row.expected_qty)) * 1000) / 1000;
                  return (
                    <div key={row.id} className="row" style={{ gap: "0.5rem", fontSize: "0.82rem" }}>
                      <span style={{ flex: 1, minWidth: 0 }}>{countName(row)}</span>
                      <span className="muted">
                        {row.expected_qty} → {row.counted_qty}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: diff === 0 ? "var(--success, #16a34a)" : "var(--warn, #d97706)",
                        }}
                      >
                        {diff === 0 ? "✓" : diff > 0 ? `+${diff}` : diff}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <FrequentlyUsedStock
        title={t("frequentlyUsed")}
        hint={t("frequentlyUsedHint")}
        items={frequentItems}
        usedLabel={t("usedTimes")}
        onHandLabel={t("onHand")}
        empty={t("empty")}
      />

      <InventoryHidProvider>
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
                  placeholder={V.inventoryPlaceholder}
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
              {isCommerce ? (
                <>
                  <div className="field">
                    <label>Sold by</label>
                    <select name="sold_by" className="select" defaultValue="each">
                      <option value="each">Each</option>
                      <option value="meter">Meter</option>
                      <option value="kg">Kilogram</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Category</label>
                    <select name="category_id" className="select" defaultValue="">
                      <option value="">Uncategorized</option>
                      {(categories || []).map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Image URL</label>
                    <input name="image_url" type="url" className="input" placeholder="https://…" />
                  </div>
                  <label className="row"><input name="available_to_sale" type="checkbox" defaultChecked /> Available at POS</label>
                  <label className="row"><input name="track_stock" type="checkbox" defaultChecked /> Track stock</label>
                  <label className="row"><input name="price_on_sale" type="checkbox" /> Enter price when sold</label>
                </>
              ) : null}
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
              sold_by: (p as { sold_by?: string }).sold_by || "each",
              available_to_sale: (p as { available_to_sale?: boolean }).available_to_sale !== false,
              track_stock: (p as { track_stock?: boolean }).track_stock !== false,
              price_on_sale: (p as { price_on_sale?: boolean }).price_on_sale === true,
              category: categories?.find((category) => category.id === (p as { category_id?: string }).category_id)?.name || null,
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
      </InventoryHidProvider>

      <SectionActivityLog title={t("activity")} logs={logs} pageSize={5} />
    </div>
  );
}
