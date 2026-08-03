import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { enrollStudentAction, upsertTuitionClassAction } from "@/app/tuition-actions";

const DAYS = [
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
  { value: "0", label: "Sun" },
];

export default async function ClassesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Tuition");
  const ctx = await requireCapability(locale, "class_schedule");
  const supabase = await createClient();

  const [{ data: classes }, { data: customers }, { data: enrollments }] = await Promise.all([
    supabase
      .from("tuition_classes")
      .select("id, name, teacher_name, weekday, start_time, end_time, room, fee, schedule")
      .eq("organization_id", ctx.organization.id)
      .order("weekday", { ascending: true }),
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(300),
    supabase
      .from("tuition_enrollments")
      .select("id, class_id, customer_id, customers(name)")
      .eq("organization_id", ctx.organization.id)
      .limit(500),
  ]);

  const byDay = new Map<number, typeof classes>();
  for (const d of [1, 2, 3, 4, 5, 6, 0]) byDay.set(d, []);
  for (const c of classes || []) {
    const day = c.weekday === null || c.weekday === undefined ? -1 : Number(c.weekday);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(c);
  }

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("classesTitle")} subtitle={t("classesSubtitle")} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("addClass")}</h3>
        <ActionForm action={upsertTuitionClassAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("className")}</label>
              <input name="name" className="input" required placeholder="Math Form 3" />
            </div>
            <div className="field">
              <label>{t("teacher")}</label>
              <input name="teacher_name" className="input" placeholder="Cikgu Aminah" />
            </div>
            <div className="field">
              <label>{t("weekday")}</label>
              <select name="weekday" className="select" defaultValue="1">
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("startTime")}</label>
              <input name="start_time" type="time" className="input" defaultValue="16:00" />
            </div>
            <div className="field">
              <label>{t("endTime")}</label>
              <input name="end_time" type="time" className="input" defaultValue="18:00" />
            </div>
            <div className="field">
              <label>{t("room")}</label>
              <input name="room" className="input" placeholder="Room A" />
            </div>
            <div className="field">
              <label>{t("fee")}</label>
              <input name="fee" type="number" className="input" defaultValue={0} step="0.01" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("saveClass")}
          </button>
        </ActionForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("timetable")}</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {DAYS.map((d) => {
            const list = byDay.get(Number(d.value)) || [];
            return (
              <div
                key={d.value}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "0.75rem",
                  minHeight: 120,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>{d.label}</div>
                {list.length ? (
                  list.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: "var(--accent-soft)",
                        borderRadius: 8,
                        padding: "0.5rem",
                        marginBottom: "0.4rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div className="muted">
                        {(c.start_time || "").toString().slice(0, 5)}
                        {c.end_time ? `–${String(c.end_time).slice(0, 5)}` : ""}
                      </div>
                      {c.teacher_name ? <div className="muted">{c.teacher_name}</div> : null}
                      {c.room ? <div className="muted">{c.room}</div> : null}
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                    —
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("enrollTitle")}</h3>
        <p className="muted">{t("enrollHint")}</p>
        <ActionForm action={enrollStudentAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
                    {c.schedule ? ` (${c.schedule})` : ""}
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
          </div>
          <button type="submit" className="btn btn-soft">
            {t("enroll")}
          </button>
        </ActionForm>

        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data">
            <thead>
              <tr>
                <th>{t("className")}</th>
                <th>{t("student")}</th>
              </tr>
            </thead>
            <tbody>
              {(enrollments || []).map((e) => {
                const cust = Array.isArray(e.customers) ? e.customers[0] : e.customers;
                const cls = (classes || []).find((c) => c.id === e.class_id);
                return (
                  <tr key={e.id}>
                    <td>{cls?.name || e.class_id}</td>
                    <td>{cust?.name || e.customer_id}</td>
                  </tr>
                );
              })}
              {!enrollments?.length ? (
                <tr>
                  <td colSpan={2} className="muted">
                    {t("noEnrollments")}
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
