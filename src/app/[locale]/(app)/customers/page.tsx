import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { CustomerRow } from "@/components/CustomerRow";
import { upsertCustomerAction } from "@/app/actions";
import { formatDateTime } from "@/lib/utils";
import type { Customer } from "@/lib/types";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Customers");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();

  const [{ data: customers }, { data: deletions }] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_deletions")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const title = ctx.organization.niche === "clinic" ? t("titleClinic") : t("title");
  const rowLabels = {
    name: t("name"),
    email: t("email"),
    phone: t("phone"),
    ic: t("ic"),
    notes: t("notes"),
    save: t("save"),
    delete: t("delete"),
    edit: t("edit"),
    cancel: t("cancel"),
    addedBy: t("addedBy"),
  };

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={title} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("add")}</h3>
        <ActionForm action={upsertCustomerAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("name")}</label>
              <input name="name" required className="input" />
            </div>
            <div className="field">
              <label>{t("ic")}</label>
              <input name="ic_number" className="input" placeholder="900101-14-5678" />
            </div>
            <div className="field">
              <label>{t("email")}</label>
              <input name="email" type="email" className="input" />
            </div>
            <div className="field">
              <label>{t("phone")}</label>
              <input name="phone" className="input" />
            </div>
          </div>
          <div className="field">
            <label>{t("notes")}</label>
            <textarea name="notes" className="textarea" />
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
                <th>{t("ic")}</th>
                <th>{t("phone")}</th>
                <th>{t("email")}</th>
                <th>{t("addedBy")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(customers || []).map((c) => (
                <CustomerRow key={c.id} customer={c as Customer} labels={rowLabels} />
              ))}
              {!customers?.length ? (
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

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("deletedTitle")}</h3>
        <p className="muted">{t("deletedHint")}</p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("deletedBy")}</th>
                <th>{t("deletedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {(deletions || []).map((d) => (
                <tr key={d.id}>
                  <td>{d.customer_name}</td>
                  <td>{d.deleted_by_name || "—"}</td>
                  <td>{formatDateTime(d.created_at)}</td>
                </tr>
              ))}
              {!deletions?.length ? (
                <tr>
                  <td colSpan={3} className="muted">
                    —
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
