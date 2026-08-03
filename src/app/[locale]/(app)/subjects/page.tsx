import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import {
  deleteTuitionSubjectAction,
  upsertTuitionSubjectAction,
} from "@/app/tuition-actions";
import { formatCurrency } from "@/lib/utils";

export default async function SubjectsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Tuition");
  const ctx = await requireCapability(locale, "class_schedule");
  const supabase = await createClient();

  const { data: subjects } = await supabase
    .from("tuition_subjects")
    .select("id, name, price, teacher_name, teacher_salary, notes, created_at")
    .eq("organization_id", ctx.organization.id)
    .order("name");

  const teacherPay = new Map<string, { subjects: number; salary: number }>();
  for (const s of subjects || []) {
    const teacher = (s.teacher_name || "").trim() || t("unassignedTeacher");
    const row = teacherPay.get(teacher) || { subjects: 0, salary: 0 };
    row.subjects += 1;
    row.salary += Number(s.teacher_salary || 0);
    teacherPay.set(teacher, row);
  }
  const payroll = [...teacherPay.entries()]
    .map(([teacher, v]) => ({ teacher, ...v }))
    .sort((a, b) => b.salary - a.salary);

  const totalStudentFees = (subjects || []).reduce((sum, s) => sum + Number(s.price || 0), 0);
  const totalTeacherPay = (subjects || []).reduce((sum, s) => sum + Number(s.teacher_salary || 0), 0);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("subjectsTitle")} subtitle={t("subjectsSubtitle")} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("addSubject")}</h3>
        <ActionForm action={upsertTuitionSubjectAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("subjectName")}</label>
              <input name="name" className="input" required placeholder="Mathematics Form 3" />
            </div>
            <div className="field">
              <label>{t("subjectPrice")}</label>
              <input name="price" type="number" className="input" defaultValue={0} step="0.01" min={0} />
            </div>
            <div className="field">
              <label>{t("subjectTeacher")}</label>
              <input name="teacher_name" className="input" placeholder="Cikgu Aminah" />
            </div>
            <div className="field">
              <label>{t("teacherSalary")}</label>
              <input
                name="teacher_salary"
                type="number"
                className="input"
                defaultValue={0}
                step="0.01"
                min={0}
              />
            </div>
          </div>
          <div className="field">
            <label>{t("subjectNotes")}</label>
            <input name="notes" className="input" placeholder={t("subjectNotesPlaceholder")} />
          </div>
          <button type="submit" className="btn btn-primary">
            {t("saveSubject")}
          </button>
        </ActionForm>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.85rem",
        }}
      >
        <div className="surface kpi" style={{ margin: 0 }}>
          <div className="kpi-label">{t("subjectsCount")}</div>
          <div className="kpi-value">{(subjects || []).length}</div>
        </div>
        <div className="surface kpi" style={{ margin: 0 }}>
          <div className="kpi-label">{t("totalSubjectFees")}</div>
          <div className="kpi-value" style={{ fontSize: "1.35rem" }}>
            {formatCurrency(totalStudentFees)}
          </div>
        </div>
        <div className="surface kpi" style={{ margin: 0 }}>
          <div className="kpi-label">{t("totalTeacherPay")}</div>
          <div className="kpi-value" style={{ fontSize: "1.35rem" }}>
            {formatCurrency(totalTeacherPay)}
          </div>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("subjectsList")}</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("subjectName")}</th>
                <th>{t("subjectPrice")}</th>
                <th>{t("subjectTeacher")}</th>
                <th>{t("teacherSalary")}</th>
                <th>{t("subjectNotes")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(subjects || []).map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{formatCurrency(Number(s.price || 0))}</td>
                  <td>{s.teacher_name || "—"}</td>
                  <td>{formatCurrency(Number(s.teacher_salary || 0))}</td>
                  <td className="muted">{s.notes || "—"}</td>
                  <td>
                    <ActionForm action={deleteTuitionSubjectAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="btn btn-ghost">
                        {t("deleteSubject")}
                      </button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
              {!subjects?.length ? (
                <tr>
                  <td colSpan={6} className="muted">
                    {t("noSubjects")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("teacherPayrollTitle")}</h3>
        <p className="muted">{t("teacherPayrollHint")}</p>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("subjectTeacher")}</th>
                <th>{t("subjectsCount")}</th>
                <th>{t("teacherSalaryTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((row) => (
                <tr key={row.teacher}>
                  <td>{row.teacher}</td>
                  <td>{row.subjects}</td>
                  <td>
                    <strong>{formatCurrency(row.salary)}</strong>
                  </td>
                </tr>
              ))}
              {!payroll.length ? (
                <tr>
                  <td colSpan={3} className="muted">
                    {t("noSubjects")}
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
