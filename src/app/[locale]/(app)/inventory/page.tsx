import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { adjustStockAction, upsertProductAction } from "@/app/actions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
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
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("sku")}</th>
                <th>{t("price")}</th>
                <th>{t("qty")}</th>
                <th>{t("addedAt")}</th>
                <th>{t("adjust")}</th>
              </tr>
            </thead>
            <tbody>
              {(products || []).map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.name}{" "}
                    {p.quantity <= p.low_stock_threshold ? (
                      <span className="badge">low</span>
                    ) : null}
                  </td>
                  <td>{p.sku || "—"}</td>
                  <td>{formatCurrency(Number(p.unit_price))}</td>
                  <td>{p.quantity}</td>
                  <td>{formatDateTime(p.created_at)}</td>
                  <td>
                    <ActionForm action={adjustStockAction} className="row">
                      <input type="hidden" name="product_id" value={p.id} />
                      <select name="type" className="select" style={{ width: 100 }}>
                        <option value="in">in</option>
                        <option value="out">out</option>
                      </select>
                      <input
                        name="quantity"
                        type="number"
                        min={1}
                        defaultValue={1}
                        className="input"
                        style={{ width: 80 }}
                      />
                      <button
                        type="submit"
                        className="btn btn-ghost"
                        style={{ padding: "0.45rem 0.8rem" }}
                      >
                        OK
                      </button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
              {!products?.length ? (
                <tr>
                  <td colSpan={6} className="muted">
                    {t("empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <SectionActivityLog title={t("activity")} logs={logs} />
    </div>
  );
}
