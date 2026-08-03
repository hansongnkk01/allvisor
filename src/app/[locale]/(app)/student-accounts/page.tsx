import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { createStudentAccountAction } from "@/app/tuition-actions";
import { formatDateTime } from "@/lib/utils";

export default async function StudentAccountsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Tuition");
  const ctx = await requireCapability(locale, "student_accounts");
  const supabase = await createClient();

  const [{ data: customers }, { data: accounts }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(500),
    supabase
      .from("tuition_students")
      .select("id, email, customer_id, active, created_at, customers(name)")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false }),
  ]);

  const linked = new Set((accounts || []).map((a) => a.customer_id));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("studentAccountsTitle")} subtitle={t("studentAccountsSubtitle")} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("createStudentAccount")}</h3>
        <p className="muted">{t("createStudentHint")}</p>
        <ol className="muted" style={{ marginTop: 0, paddingLeft: "1.2rem" }}>
          <li>{t("stepAddCustomer")}</li>
          <li>{t("stepCreateLogin")}</li>
          <li>{t("stepStudentLogin")}</li>
        </ol>
        <ActionForm action={createStudentAccountAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("student")}</label>
              <select name="customer_id" className="select" required>
                <option value="">—</option>
                {(customers || [])
                  .filter((c) => !linked.has(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.email ? ` (${c.email})` : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>{t("studentEmail")}</label>
              <input name="email" type="email" className="input" required placeholder="student@email.com" />
            </div>
            <div className="field">
              <label>{t("studentPassword")}</label>
              <input name="password" type="password" className="input" required minLength={6} />
            </div>
            <div className="field">
              <label>{t("fullNameOptional")}</label>
              <input name="full_name" className="input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("createLogin")}
          </button>
        </ActionForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("existingAccounts")}</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("student")}</th>
                <th>{t("studentEmail")}</th>
                <th>{t("status")}</th>
                <th>{t("createdAt")}</th>
              </tr>
            </thead>
            <tbody>
              {(accounts || []).map((a) => {
                const cust = Array.isArray(a.customers) ? a.customers[0] : a.customers;
                return (
                  <tr key={a.id}>
                    <td>{cust?.name || a.customer_id}</td>
                    <td>{a.email}</td>
                    <td>{a.active ? t("active") : t("inactive")}</td>
                    <td>{formatDateTime(a.created_at)}</td>
                  </tr>
                );
              })}
              {!accounts?.length ? (
                <tr>
                  <td colSpan={4} className="muted">
                    {t("noStudentAccounts")}
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
