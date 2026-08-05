"use client";

import { useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { demoCustomers } from "@/lib/demo-dashboard-data";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

function DemoNoopForm({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <form
      className={className}
      style={style}
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}

const DAYS = [
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
  { value: "0", label: "Sun" },
];

function demoSubjects() {
  return [
    {
      id: "s1",
      name: "Mathematics Form 4",
      price: 120,
      teacher_name: "Cikgu Nora",
      teacher_salary: 800,
      notes: "Tuesday & Thursday",
    },
    {
      id: "s2",
      name: "Science Form 5",
      price: 130,
      teacher_name: "Encik Rizal",
      teacher_salary: 850,
      notes: "Lab on Friday",
    },
    {
      id: "s3",
      name: "English Form 3",
      price: 100,
      teacher_name: "Cikgu Nora",
      teacher_salary: 600,
      notes: null as string | null,
    },
  ];
}

function demoClasses() {
  return [
    {
      id: "cl1",
      name: "Math Form 4 — A",
      teacher_name: "Cikgu Nora",
      weekday: 2,
      start_time: "16:00",
      end_time: "18:00",
      room: "R1",
      fee: 120,
      schedule: "Tue 16:00",
      subject_id: "s1",
    },
    {
      id: "cl2",
      name: "Science Form 5 — Lab",
      teacher_name: "Encik Rizal",
      weekday: 5,
      start_time: "17:00",
      end_time: "19:00",
      room: "Lab 2",
      fee: 130,
      schedule: "Fri 17:00",
      subject_id: "s2",
    },
    {
      id: "cl3",
      name: "English Form 3",
      teacher_name: "Cikgu Nora",
      weekday: 4,
      start_time: "15:00",
      end_time: "16:30",
      room: "R2",
      fee: 100,
      schedule: "Thu 15:00",
      subject_id: "s3",
    },
  ];
}

/** Matches real subjects/page.tsx for tuition. */
export function TuitionSubjectsDemo() {
  const t = useTranslations("Tuition");
  const subjects = useMemo(() => demoSubjects(), []);

  const teacherPay = new Map<string, { subjects: number; salary: number }>();
  for (const s of subjects) {
    const teacher = (s.teacher_name || "").trim() || t("unassignedTeacher");
    const row = teacherPay.get(teacher) || { subjects: 0, salary: 0 };
    row.subjects += 1;
    row.salary += Number(s.teacher_salary || 0);
    teacherPay.set(teacher, row);
  }
  const payroll = [...teacherPay.entries()]
    .map(([teacher, v]) => ({ teacher, ...v }))
    .sort((a, b) => b.salary - a.salary);

  const totalStudentFees = subjects.reduce((sum, s) => sum + Number(s.price || 0), 0);
  const totalTeacherPay = subjects.reduce((sum, s) => sum + Number(s.teacher_salary || 0), 0);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("subjectsTitle")} subtitle={t("subjectsSubtitle")} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("addSubject")}</h3>
        <DemoNoopForm className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("subjectName")}</label>
              <input name="name" className="input" placeholder="Mathematics Form 3" readOnly />
            </div>
            <div className="field">
              <label>{t("subjectPrice")}</label>
              <input name="price" type="number" className="input" defaultValue={0} step="0.01" min={0} readOnly />
            </div>
            <div className="field">
              <label>{t("subjectTeacher")}</label>
              <input name="teacher_name" className="input" placeholder="Cikgu Aminah" readOnly />
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
                readOnly
              />
            </div>
          </div>
          <div className="field">
            <label>{t("subjectNotes")}</label>
            <input name="notes" className="input" placeholder={t("subjectNotesPlaceholder")} readOnly />
          </div>
          <button type="submit" className="btn btn-primary">
            {t("saveSubject")}
          </button>
        </DemoNoopForm>
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
          <div className="kpi-value">{subjects.length}</div>
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
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{formatCurrency(Number(s.price || 0))}</td>
                  <td>{s.teacher_name || "—"}</td>
                  <td>{formatCurrency(Number(s.teacher_salary || 0))}</td>
                  <td className="muted">{s.notes || "—"}</td>
                  <td>
                    <button type="button" className="btn btn-ghost">
                      {t("deleteSubject")}
                    </button>
                  </td>
                </tr>
              ))}
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Matches real classes/page.tsx for tuition. */
export function TuitionClassesDemo() {
  const t = useTranslations("Tuition");
  const classes = useMemo(() => demoClasses(), []);
  const subjects = useMemo(() => demoSubjects(), []);
  const customers = useMemo(() => demoCustomers("tuition"), []);
  const enrollments = useMemo(
    () => [
      { id: "e1", class_id: "cl1", customer_id: "c1", customer_name: customers[0]?.name || "Aina Rahman" },
      { id: "e2", class_id: "cl1", customer_id: "c3", customer_name: customers[2]?.name || "Siti Aminah" },
      { id: "e3", class_id: "cl2", customer_id: "c2", customer_name: customers[1]?.name || "Lim Wei" },
    ],
    [customers]
  );

  const byDay = new Map<number, typeof classes>();
  for (const d of [1, 2, 3, 4, 5, 6, 0]) byDay.set(d, []);
  for (const c of classes) {
    const day = c.weekday;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(c);
  }

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("classesTitle")} subtitle={t("classesSubtitle")} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("addClass")}</h3>
        <DemoNoopForm className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("className")}</label>
              <input name="name" className="input" placeholder="Math Form 3" readOnly />
            </div>
            <div className="field">
              <label>{t("linkedSubject")}</label>
              <select name="subject_id" className="select" defaultValue="" disabled>
                <option value="">—</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.teacher_name ? ` · ${s.teacher_name}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("teacher")}</label>
              <input name="teacher_name" className="input" defaultValue="-" readOnly />
            </div>
            <div className="field">
              <label>{t("weekday")}</label>
              <select name="weekday" className="select" defaultValue="1" disabled>
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("startTime")}</label>
              <input name="start_time" type="time" className="input" defaultValue="16:00" readOnly />
            </div>
            <div className="field">
              <label>{t("endTime")}</label>
              <input name="end_time" type="time" className="input" defaultValue="18:00" readOnly />
            </div>
            <div className="field">
              <label>{t("room")}</label>
              <input name="room" className="input" defaultValue="-" readOnly />
            </div>
            <div className="field">
              <label>{t("fee")}</label>
              <input name="fee" type="number" className="input" defaultValue={0} step="0.01" readOnly />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("saveClass")}
          </button>
        </DemoNoopForm>
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
                  border: "1px solid var(--line)",
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
        <DemoNoopForm className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("className")}</label>
              <select name="class_id" className="select" disabled>
                <option value="">—</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.schedule ? ` (${c.schedule})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("student")}</label>
              <select name="customer_id" className="select" disabled>
                <option value="">—</option>
                {customers.map((c) => (
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
        </DemoNoopForm>

        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data">
            <thead>
              <tr>
                <th>{t("className")}</th>
                <th>{t("student")}</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => {
                const cls = classes.find((c) => c.id === e.class_id);
                return (
                  <tr key={e.id}>
                    <td>{cls?.name || e.class_id}</td>
                    <td>{e.customer_name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Matches real attendance/page.tsx for tuition. */
export function TuitionAttendanceDemo() {
  const t = useTranslations("Tuition");
  const classes = useMemo(() => demoClasses(), []);
  const customers = useMemo(() => demoCustomers("tuition"), []);
  const today = new Date().toISOString().slice(0, 10);
  const rows = useMemo(
    () => [
      {
        id: "a1",
        class_id: "cl1",
        customer_id: "c1",
        attended_on: today,
        present: true,
        customer_name: customers[0]?.name || "Aina Rahman",
      },
      {
        id: "a2",
        class_id: "cl1",
        customer_id: "c3",
        attended_on: today,
        present: false,
        customer_name: customers[2]?.name || "Siti Aminah",
      },
      {
        id: "a3",
        class_id: "cl2",
        customer_id: "c2",
        attended_on: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
        present: true,
        customer_name: customers[1]?.name || "Lim Wei",
      },
    ],
    [customers, today]
  );

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("attendanceTitle")} subtitle={t("attendanceSubtitle")} />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <DemoNoopForm className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("className")}</label>
              <select name="class_id" className="select" disabled>
                <option value="">—</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("student")}</label>
              <select name="customer_id" className="select" disabled>
                <option value="">—</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("date")}</label>
              <input name="attended_on" type="date" className="input" defaultValue={today} readOnly />
            </div>
            <div className="field">
              <label>{t("present")}</label>
              <select name="present" className="select" defaultValue="true" disabled>
                <option value="true">{t("yes")}</option>
                <option value="false">{t("no")}</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("saveAttendance")}
          </button>
        </DemoNoopForm>
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
              {rows.map((r) => {
                const cls = classes.find((c) => c.id === r.class_id);
                return (
                  <tr key={r.id}>
                    <td>{formatDate(r.attended_on)}</td>
                    <td>{cls?.name || "—"}</td>
                    <td>{r.customer_name}</td>
                    <td>{r.present ? t("yes") : t("no")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Matches real assessments/page.tsx for tuition. */
export function TuitionAssessmentsDemo() {
  const t = useTranslations("Tuition");
  const subjects = useMemo(() => demoSubjects(), []);
  const assessments = useMemo(
    () => [
      {
        id: "as1",
        title: "Chapter 3 quiz",
        instructions: "Answer all questions.",
        due_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        max_score: 100,
        subject_id: "s1",
      },
      {
        id: "as2",
        title: "Lab test 2",
        instructions: null as string | null,
        due_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        max_score: 50,
        subject_id: "s2",
      },
    ],
    []
  );
  const customers = useMemo(() => demoCustomers("tuition"), []);
  const submissions = useMemo(
    () => [
      {
        id: "sub1",
        assessment_id: "as1",
        customer_id: "c1",
        customer_name: customers[0]?.name || "Aina Rahman",
        status: "submitted",
        score: 78 as number | null,
        feedback: "Good work on algebra.",
      },
      {
        id: "sub2",
        assessment_id: "as1",
        customer_id: "c3",
        customer_name: customers[2]?.name || "Siti Aminah",
        status: "submitted",
        score: null as number | null,
        feedback: "",
      },
      {
        id: "sub3",
        assessment_id: "as2",
        customer_id: "c2",
        customer_name: customers[1]?.name || "Lim Wei",
        status: "submitted",
        score: 41 as number | null,
        feedback: "Revise units.",
      },
    ],
    [customers]
  );

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("assessmentsTitle")} subtitle={t("assessmentsSubtitle")} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("createAssessment")}</h3>
        <DemoNoopForm className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("assessmentTitle")}</label>
              <input name="title" className="input" placeholder="Chapter 5 quiz" readOnly />
            </div>
            <div className="field">
              <label>{t("subjectRequired")}</label>
              <select name="subject_id" className="select" defaultValue="" disabled>
                <option value="" disabled>
                  —
                </option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("dueAt")}</label>
              <input name="due_at" type="datetime-local" className="input" readOnly />
            </div>
            <div className="field">
              <label>{t("maxScore")}</label>
              <input name="max_score" type="number" className="input" defaultValue={100} readOnly />
            </div>
          </div>
          <div className="field">
            <label>{t("instructions")}</label>
            <textarea name="instructions" className="textarea" rows={2} readOnly />
          </div>
          <button type="submit" className="btn btn-primary">
            {t("publishAssessment")}
          </button>
        </DemoNoopForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("assessmentList")}</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("assessmentTitle")}</th>
                <th>{t("subjectName")}</th>
                <th>{t("dueAt")}</th>
                <th>{t("maxScore")}</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => {
                const subj = subjects.find((s) => s.id === a.subject_id);
                return (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>{subj?.name || "—"}</td>
                    <td>{a.due_at ? formatDateTime(a.due_at) : "—"}</td>
                    <td>{a.max_score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("gradeTitle")}</h3>
        <p className="muted">{t("gradeHint")}</p>
        <div className="stack" style={{ gap: "1rem" }}>
          {submissions.map((s) => {
            const assessment = assessments.find((a) => a.id === s.assessment_id);
            const subj = subjects.find((x) => x.id === assessment?.subject_id);
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
                      {s.customer_name}
                      {subj ? ` · ${subj.name}` : ""}
                    </div>
                  </div>
                  {s.score != null ? (
                    <span className="badge">
                      {s.score}/{assessment?.max_score ?? 100}
                    </span>
                  ) : null}
                </div>
                <DemoNoopForm className="row" style={{ flexWrap: "wrap", marginTop: 8 }}>
                  <input
                    name="score"
                    type="number"
                    className="input"
                    style={{ width: 100 }}
                    defaultValue={s.score ?? ""}
                    placeholder={t("score")}
                    readOnly
                  />
                  <input
                    name="feedback"
                    className="input"
                    style={{ flex: 1, minWidth: 160 }}
                    defaultValue={s.feedback || ""}
                    placeholder={t("feedback")}
                    readOnly
                  />
                  <button type="submit" className="btn btn-soft">
                    {t("saveGrade")}
                  </button>
                </DemoNoopForm>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
