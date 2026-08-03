import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { createTuitionAssessmentAction, gradeSubmissionAction } from "@/app/tuition-actions";
import { formatDateTime } from "@/lib/utils";

export default async function AssessmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Tuition");
  const ctx = await requireCapability(locale, "assessments");
  const supabase = await createClient();

  const [{ data: classes }, { data: assessments }, { data: submissions }] = await Promise.all([
    supabase
      .from("tuition_classes")
      .select("id, name")
      .eq("organization_id", ctx.organization.id)
      .order("name"),
    supabase
      .from("tuition_assessments")
      .select("id, title, instructions, due_at, max_score, class_id, created_at")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("tuition_submissions")
      .select(
        "id, assessment_id, customer_id, status, answer_text, score, feedback, submitted_at, customers(name)"
      )
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("assessmentsTitle")} subtitle={t("assessmentsSubtitle")} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("createAssessment")}</h3>
        <ActionForm action={createTuitionAssessmentAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("assessmentTitle")}</label>
              <input name="title" className="input" required placeholder="Chapter 5 quiz" />
            </div>
            <div className="field">
              <label>{t("classOptional")}</label>
              <select name="class_id" className="select" defaultValue="">
                <option value="">{t("allStudents")}</option>
                {(classes || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("dueAt")}</label>
              <input name="due_at" type="datetime-local" className="input" />
            </div>
            <div className="field">
              <label>{t("maxScore")}</label>
              <input name="max_score" type="number" className="input" defaultValue={100} />
            </div>
          </div>
          <div className="field">
            <label>{t("instructions")}</label>
            <textarea name="instructions" className="textarea" rows={3} />
          </div>
          <button type="submit" className="btn btn-primary">
            {t("publishAssessment")}
          </button>
        </ActionForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("assessmentList")}</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("assessmentTitle")}</th>
                <th>{t("className")}</th>
                <th>{t("dueAt")}</th>
                <th>{t("maxScore")}</th>
              </tr>
            </thead>
            <tbody>
              {(assessments || []).map((a) => {
                const cls = (classes || []).find((c) => c.id === a.class_id);
                return (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>{cls?.name || t("allStudents")}</td>
                    <td>{a.due_at ? formatDateTime(a.due_at) : "—"}</td>
                    <td>{a.max_score}</td>
                  </tr>
                );
              })}
              {!assessments?.length ? (
                <tr>
                  <td colSpan={4} className="muted">
                    {t("noAssessments")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("gradeTitle")}</h3>
        <p className="muted">{t("gradeHint")}</p>
        <div className="stack" style={{ gap: "1rem" }}>
          {(submissions || []).map((s) => {
            const cust = Array.isArray(s.customers) ? s.customers[0] : s.customers;
            const assessment = (assessments || []).find((a) => a.id === s.assessment_id);
            return (
              <div
                key={s.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "1rem",
                }}
              >
                <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div>
                    <strong>{assessment?.title || "Assessment"}</strong>
                    <div className="muted">
                      {cust?.name || s.customer_id} · {s.status}
                      {s.submitted_at ? ` · ${formatDateTime(s.submitted_at)}` : ""}
                    </div>
                  </div>
                  {s.score != null ? (
                    <span className="badge">
                      {s.score}/{assessment?.max_score ?? 100}
                    </span>
                  ) : null}
                </div>
                {s.answer_text ? (
                  <p style={{ whiteSpace: "pre-wrap", margin: "0.75rem 0" }}>{s.answer_text}</p>
                ) : (
                  <p className="muted">{t("notSubmitted")}</p>
                )}
                {s.status === "submitted" || s.status === "graded" ? (
                  <ActionForm action={gradeSubmissionAction} className="row" style={{ flexWrap: "wrap" }}>
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      name="score"
                      type="number"
                      className="input"
                      style={{ width: 100 }}
                      defaultValue={s.score ?? ""}
                      placeholder={t("score")}
                      required
                    />
                    <input
                      name="feedback"
                      className="input"
                      style={{ flex: 1, minWidth: 160 }}
                      defaultValue={s.feedback || ""}
                      placeholder={t("feedback")}
                    />
                    <button type="submit" className="btn btn-soft">
                      {t("saveGrade")}
                    </button>
                  </ActionForm>
                ) : null}
              </div>
            );
          })}
          {!submissions?.length ? <p className="muted">{t("noSubmissions")}</p> : null}
        </div>
      </div>
    </div>
  );
}
