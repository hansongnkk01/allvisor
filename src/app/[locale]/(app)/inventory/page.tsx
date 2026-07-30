import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { upsertProductAction } from "@/app/actions";
import { InventoryStockTable } from "@/components/InventoryStockTable";
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
  const [{ data: products }, logs] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false }),
    fetchSectionLogs(ctx.organization.id, ["inventory"]),
  ]);

  const isClinic = ctx.organization.niche === "clinic";

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title={t("title")}
        subtitle={isClinic ? t("clinicSubtitle") : t("retailSubtitle")}
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
            unit_price: Number(p.unit_price),
            quantity: p.quantity,
            low_stock_threshold: p.low_stock_threshold,
            created_at: p.created_at,
          }))}
          labels={{
            name: t("name"),
            sku: t("sku"),
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

      <SectionActivityLog title={t("activity")} logs={logs} />
    </div>
  );
}
