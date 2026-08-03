import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStudent, getStudentAdminClient } from "@/lib/tuition-student";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { submitAssessmentAction } from "@/app/tuition-actions";
import { formatDateTime } from "@/lib/utils";

export default async function StudentAssessmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("TuitionStudent");
  const ctx = await requireStudent(locale);
  const admin = await getStudentAdminClient();

  type Sub = {
    id: string;
    status: string;
    answer_text: string | null;
    score: number | null;
    feedback: string | null;
    submitted_at: string | null;
    assessment_id: string;
  };
  type Assess = {
    id: string;
    title: string;
    instructions: string | null;
    due_at: string | null;
    max_score: number;
  };

  let submissions: Sub[] = [];
  let assessments: Assess[] = [];
  if (admin) {
    const { data: subs } = await admin
      .from("tuition_submissions")
      .select("id, status, answer_text, score, feedback, submitted_at, assessment_id")
      .eq("organization_id", ctx.organization.id)
      .eq("customer_id", ctx.customerId)
      .order("created_at", { ascending: false });
    submissions = (subs || []) as Sub[];
    const ids = [...new Set(submissions.map((s) => s.assessment_id))];
    if (ids.length) {
      const { data: a } = await admin
        .from("tuition_assessments")
        .select("id, title, instructions, due_at, max_score")
        .in("id", ids);
      assessments = (a || []) as Assess[];
    }
  }

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("assessmentsTitle")} subtitle={t("assessmentsSubtitle")} />
      {!submissions.length ? <p className="muted">{t("noAssessments")}</p> : null}
      {submissions.map((s) => {
        const a = assessments.find((x) => x.id === s.assessment_id);
        return (
          <div key={s.id} className="surface" style={{ padding: "1.25rem" }}>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>{a?.title || "Assessment"}</h3>
              <span className="badge">{s.status}</span>
            </div>
            {a?.due_at ? (
              <p className="muted" style={{ marginBottom: "0.5rem" }}>
                {t("due")}: {formatDateTime(a.due_at)}
              </p>
            ) : null}
            {a?.instructions ? (
              <p style={{ whiteSpace: "pre-wrap" }}>{a.instructions}</p>
            ) : null}

            {s.status === "graded" ? (
              <div>
                <p>
                  <strong>
                    {t("score")}: {s.score}/{a?.max_score ?? 100}
                  </strong>
                </p>
                {s.feedback ? <p className="muted">{s.feedback}</p> : null}
                {s.answer_text ? (
                  <p style={{ whiteSpace: "pre-wrap", marginTop: "0.75rem" }}>{s.answer_text}</p>
                ) : null}
              </div>
            ) : (
              <ActionForm action={submitAssessmentAction} className="stack">
                <input type="hidden" name="submission_id" value={s.id} />
                <div className="field">
                  <label>{t("yourAnswer")}</label>
                  <textarea
                    name="answer_text"
                    className="textarea"
                    rows={5}
                    required
                    defaultValue={s.answer_text || ""}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={s.status === "graded"}>
                  {s.status === "submitted" ? t("updateSubmit") : t("submit")}
                </button>
              </ActionForm>
            )}
          </div>
        );
      })}
    </div>
  );
}
