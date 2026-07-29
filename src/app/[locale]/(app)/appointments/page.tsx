import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { createAppointmentAction } from "@/app/actions";
import { formatDateTime } from "@/lib/utils";

export default async function AppointmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Appointments");
  const ctx = await requireOrg(locale);

  if (ctx.organization.niche !== "clinic") {
    redirect({ href: "/dashboard", locale });
  }

  const supabase = await createClient();
  const [{ data: appointments }, { data: customers }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, customers(name)")
      .eq("organization_id", ctx.organization.id)
      .order("starts_at", { ascending: true }),
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", ctx.organization.id)
      .order("name"),
  ]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("add")}</h3>
        <ActionForm action={createAppointmentAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("patient")}</label>
              <select name="customer_id" required className="select">
                <option value="">—</option>
                {(customers || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("titleLabel")}</label>
              <input name="title" required className="input" placeholder="Consultation" />
            </div>
            <div className="field">
              <label>{t("startsAt")}</label>
              <input name="starts_at" type="datetime-local" required className="input" />
            </div>
            <div className="field">
              <label>{t("endsAt")}</label>
              <input name="ends_at" type="datetime-local" required className="input" />
            </div>
            <div className="field">
              <label>{t("status")}</label>
              <select name="status" className="select" defaultValue="scheduled">
                <option value="scheduled">scheduled</option>
                <option value="confirmed">confirmed</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
                <option value="no_show">no_show</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>{t("notes")}</label>
            <textarea name="notes" className="textarea" />
          </div>
          <label className="row" style={{ gap: "0.5rem" }}>
            <input type="checkbox" name="reminder_sent" />
            <span>{t("reminder")}</span>
          </label>
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
                <th>{t("titleLabel")}</th>
                <th>{t("patient")}</th>
                <th>{t("startsAt")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {(appointments || []).map((a) => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td>{a.customers?.name || "—"}</td>
                  <td>{formatDateTime(a.starts_at)}</td>
                  <td>
                    <span className="badge">{a.status}</span>
                  </td>
                </tr>
              ))}
              {!appointments?.length ? (
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
