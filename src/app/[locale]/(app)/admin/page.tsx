import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import {
  deletePriceListItemAction,
  deleteServiceItemAction,
  upsertPriceListItemAction,
  upsertServiceItemAction,
} from "@/app/actions";
import { formatCurrency } from "@/lib/utils";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();

  const [{ data: services }, { data: prices }] = await Promise.all([
    supabase
      .from("service_items")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("category")
      .order("name"),
    supabase
      .from("price_list_items")
      .select("*, service_items(name, category)")
      .eq("organization_id", ctx.organization.id)
      .order("name"),
  ]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("servicesTitle")}</h3>
        <p className="muted">{t("servicesHint")}</p>
        <ActionForm action={upsertServiceItemAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("serviceName")}</label>
              <input name="name" required className="input" />
            </div>
            <div className="field">
              <label>{t("category")}</label>
              <input name="category" className="input" placeholder="General / Dental / Lab" />
            </div>
            <div className="field">
              <label>{t("description")}</label>
              <input name="description" className="input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("addService")}
          </button>
        </ActionForm>

        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data">
            <thead>
              <tr>
                <th>{t("serviceName")}</th>
                <th>{t("category")}</th>
                <th>{t("description")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(services || []).map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <span className="badge">{s.category}</span>
                  </td>
                  <td>{s.description || "—"}</td>
                  <td>
                    <form
                      action={async () => {
                        "use server";
                        await deleteServiceItemAction(s.id);
                      }}
                    >
                      <button type="submit" className="btn btn-ghost" style={{ padding: "0.35rem 0.7rem" }}>
                        {t("delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!services?.length ? (
                <tr>
                  <td colSpan={4} className="muted">
                    {t("emptyServices")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("pricesTitle")}</h3>
        <p className="muted">{t("pricesHint")}</p>
        <ActionForm action={upsertPriceListItemAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("priceName")}</label>
              <input name="name" required className="input" placeholder="Consultation 30min" />
            </div>
            <div className="field">
              <label>{t("linkService")}</label>
              <select name="service_item_id" className="select">
                <option value="">—</option>
                {(services || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.category} / {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("price")}</label>
              <input name="unit_price" type="number" step="0.01" defaultValue={0} className="input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("addPrice")}
          </button>
        </ActionForm>

        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data">
            <thead>
              <tr>
                <th>{t("priceName")}</th>
                <th>{t("linkService")}</th>
                <th>{t("price")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(prices || []).map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>
                    {p.service_items
                      ? `${p.service_items.category} / ${p.service_items.name}`
                      : "—"}
                  </td>
                  <td>{formatCurrency(Number(p.unit_price))}</td>
                  <td>
                    <form
                      action={async () => {
                        "use server";
                        await deletePriceListItemAction(p.id);
                      }}
                    >
                      <button type="submit" className="btn btn-ghost" style={{ padding: "0.35rem 0.7rem" }}>
                        {t("delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!prices?.length ? (
                <tr>
                  <td colSpan={4} className="muted">
                    {t("emptyPrices")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
