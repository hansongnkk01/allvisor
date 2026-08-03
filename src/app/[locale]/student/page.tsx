import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireStudent, getStudentAdminClient } from "@/lib/tuition-student";
import { PageHeader } from "@/components/PageHeader";

export default async function StudentHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("TuitionStudent");
  const ctx = await requireStudent(locale);
  const admin = await getStudentAdminClient();

  let pending = 0;
  let classCount = 0;
  if (admin) {
    const [{ count: p }, { count: e }] = await Promise.all([
      admin
        .from("tuition_submissions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", ctx.organization.id)
        .eq("customer_id", ctx.customerId)
        .in("status", ["assigned", "submitted"]),
      admin
        .from("tuition_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", ctx.organization.id)
        .eq("customer_id", ctx.customerId),
    ]);
    pending = p || 0;
    classCount = e || 0;
  }

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={`${t("welcome")}, ${ctx.customerName}`} subtitle={ctx.organization.name} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.85rem",
        }}
      >
        <div className="surface kpi" style={{ margin: 0 }}>
          <div className="kpi-label">{t("myClasses")}</div>
          <div className="kpi-value">{classCount}</div>
        </div>
        <div className="surface kpi" style={{ margin: 0 }}>
          <div className="kpi-label">{t("openAssessments")}</div>
          <div className="kpi-value">{pending}</div>
        </div>
      </div>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <Link href="/student/timetable" className="btn btn-soft">
          {t("viewTimetable")}
        </Link>
        <Link href="/student/assessments" className="btn btn-primary">
          {t("viewAssessments")}
        </Link>
      </div>
    </div>
  );
}
