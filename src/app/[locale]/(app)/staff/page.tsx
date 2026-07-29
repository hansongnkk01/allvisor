import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { addStaffAction } from "@/app/actions";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Staff");
  const ctx = await requireOrg(locale);
  const canManage = ctx.membership.role === "owner" || ctx.membership.role === "admin";
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("memberships")
    .select("*, profiles(full_name, email)")
    .eq("organization_id", ctx.organization.id)
    .order("created_at");

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} />

      {canManage ? (
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("add")}</h3>
          <ActionForm action={addStaffAction} className="stack">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <div className="field">
                <label>{t("fullName")}</label>
                <input name="full_name" className="input" />
              </div>
              <div className="field">
                <label>{t("email")}</label>
                <input name="email" type="email" required className="input" />
              </div>
              <div className="field">
                <label>{t("password")}</label>
                <input name="password" type="password" required minLength={6} className="input" />
              </div>
              <div className="field">
                <label>{t("role")}</label>
                <select name="role" className="select" defaultValue="staff">
                  <option value="staff">staff</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              {t("add")}
            </button>
          </ActionForm>
        </div>
      ) : (
        <div className="surface" style={{ padding: "1.25rem" }}>
          <p className="muted">{t("ownerOnly")}</p>
        </div>
      )}

      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("fullName")}</th>
                <th>{t("email")}</th>
                <th>{t("role")}</th>
              </tr>
            </thead>
            <tbody>
              {(members || []).map((m) => (
                <tr key={m.id}>
                  <td>{m.profiles?.full_name || "—"}</td>
                  <td>{m.profiles?.email || "—"}</td>
                  <td>
                    <span className="badge">{m.role}</span>
                  </td>
                </tr>
              ))}
              {!members?.length ? (
                <tr>
                  <td colSpan={3} className="muted">
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
