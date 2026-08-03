import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireStudent, getStudentAdminClient } from "@/lib/tuition-student";
import { PageHeader } from "@/components/PageHeader";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function StudentTimetablePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("TuitionStudent");
  const ctx = await requireStudent(locale);
  const admin = await getStudentAdminClient();

  type ClassRow = {
    id: string;
    name: string;
    teacher_name: string | null;
    weekday: number | null;
    start_time: string | null;
    end_time: string | null;
    room: string | null;
  };

  let classes: ClassRow[] = [];
  if (admin) {
    const { data: enrollments } = await admin
      .from("tuition_enrollments")
      .select("class_id")
      .eq("organization_id", ctx.organization.id)
      .eq("customer_id", ctx.customerId);
    const ids = (enrollments || []).map((e) => e.class_id);
    if (ids.length) {
      const { data } = await admin
        .from("tuition_classes")
        .select("id, name, teacher_name, weekday, start_time, end_time, room")
        .in("id", ids);
      classes = (data || []) as ClassRow[];
    }
  }

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("timetableTitle")} subtitle={t("timetableSubtitle")} />
      <div className="surface" style={{ padding: "1.25rem" }}>
        {!classes.length ? (
          <p className="muted">{t("noClasses")}</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("day")}</th>
                  <th>{t("time")}</th>
                  <th>{t("className")}</th>
                  <th>{t("teacher")}</th>
                  <th>{t("room")}</th>
                </tr>
              </thead>
              <tbody>
                {[...classes]
                  .sort((a, b) => (a.weekday ?? 9) - (b.weekday ?? 9))
                  .map((c) => (
                    <tr key={c.id}>
                      <td>{c.weekday != null ? DAYS[c.weekday] : "—"}</td>
                      <td>
                        {(c.start_time || "").toString().slice(0, 5)}
                        {c.end_time ? `–${String(c.end_time).slice(0, 5)}` : ""}
                      </td>
                      <td>{c.name}</td>
                      <td>{c.teacher_name || "—"}</td>
                      <td>{c.room || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
