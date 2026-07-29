import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { deleteCustomerAction, upsertCustomerAction } from "@/app/actions";

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
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false });

  const title = ctx.organization.niche === "clinic" ? t("titleClinic") : t("title");

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
                <th>{t("phone")}</th>
                <th>{t("email")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(customers || []).map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.email || "—"}</td>
                  <td>
                    <form
                      action={async () => {
                        "use server";
                        await deleteCustomerAction(c.id);
                      }}
                    >
                      <button type="submit" className="btn btn-ghost" style={{ padding: "0.35rem 0.7rem" }}>
                        {t("delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!customers?.length ? (
                <tr>
                  <td colSpan={4} className="muted">
                    {t("empty")}
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
