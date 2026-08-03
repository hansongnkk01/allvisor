import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { markAttendanceAction } from "@/app/tuition-actions";
import { formatDate } from "@/lib/utils";

export default async function AttendancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Tuition");
  const ctx = await requireCapability(locale, "attendance");
  const supabase = await createClient();

  const [{ data: classes }, { data: customers }, { data: rows }] = await Promise.all([
    supabase
      .from("tuition_classes")
      .select("id, name")
      .eq("organization_id", ctx.organization.id)
      .order("name"),
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(300),
    supabase
      .from("tuition_attendance")
      .select("id, class_id, customer_id, attended_on, present, customers(name)")
      .eq("organization_id", ctx.organization.id)
      .order("attended_on", { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("attendanceTitle")} subtitle={t("attendanceSubtitle")} />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <ActionForm action={markAttendanceAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("className")}</label>
              <select name="class_id" className="select" required>
                <option value="">—</option>
                {(classes || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("student")}</label>
              <select name="customer_id" className="select" required>
                <option value="">—</option>
                {(customers || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("date")}</label>
              <input
                name="attended_on"
                type="date"
                className="input"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="field">
              <label>{t("present")}</label>
              <select name="present" className="select" defaultValue="true">
                <option value="true">{t("yes")}</option>
                <option value="false">{t("no")}</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("saveAttendance")}
          </button>
        </ActionForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("className")}</th>
                <th>{t("student")}</th>
                <th>{t("present")}</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((r) => {
                const cust = Array.isArray(r.customers) ? r.customers[0] : r.customers;
                const cls = (classes || []).find((c) => c.id === r.class_id);
                return (
                  <tr key={r.id}>
                    <td>{formatDate(r.attended_on)}</td>
                    <td>{cls?.name || "—"}</td>
                    <td>{cust?.name || "—"}</td>
                    <td>{r.present ? t("yes") : t("no")}</td>
                  </tr>
                );
              })}
              {!rows?.length ? (
                <tr>
                  <td colSpan={4} className="muted">
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
