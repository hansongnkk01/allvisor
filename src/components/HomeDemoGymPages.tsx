"use client";

import { useTranslations } from "next-intl";
import { useMemo, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { demoCustomers } from "@/lib/demo-dashboard-data";

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

function demoGymClasses() {
  return [
    {
      id: "cl1",
      name: "HIIT",
      teacher_name: "Coach Dan",
      weekday: 1,
      start_time: "06:30",
      end_time: "07:15",
      room: "Studio A",
      fee: 0,
      schedule: "Mon 06:30",
    },
    {
      id: "cl2",
      name: "Yoga Flow",
      teacher_name: "Coach Mei",
      weekday: 2,
      start_time: "09:00",
      end_time: "10:00",
      room: "Studio B",
      fee: 0,
      schedule: "Tue 09:00",
    },
    {
      id: "cl3",
      name: "Strength",
      teacher_name: "Coach Dan",
      weekday: 4,
      start_time: "18:00",
      end_time: "19:00",
      room: "Floor 1",
      fee: 0,
      schedule: "Thu 18:00",
    },
    {
      id: "cl4",
      name: "Spin",
      teacher_name: "Coach Aina",
      weekday: 6,
      start_time: "08:00",
      end_time: "08:45",
      room: "Studio A",
      fee: 15,
      schedule: "Sat 08:00",
    },
  ];
}

/** Matches real classes/page.tsx for gym (Gym translations, no subject link). */
export function GymClassesDemo() {
  const t = useTranslations("Gym");
  const classes = useMemo(() => demoGymClasses(), []);
  const customers = useMemo(() => demoCustomers("gym"), []);
  const enrollments = useMemo(
    () => [
      { id: "e1", class_id: "cl1", customer_name: customers[0]?.name || "Aina Rahman" },
      { id: "e2", class_id: "cl2", customer_name: customers[1]?.name || "Lim Wei" },
      { id: "e3", class_id: "cl3", customer_name: customers[0]?.name || "Aina Rahman" },
      { id: "e4", class_id: "cl3", customer_name: customers[2]?.name || "Siti Aminah" },
    ],
    [customers]
  );

  const byDay = new Map<number, typeof classes>();
  for (const d of [1, 2, 3, 4, 5, 6, 0]) byDay.set(d, []);
  for (const c of classes) {
    if (!byDay.has(c.weekday)) byDay.set(c.weekday, []);
    byDay.get(c.weekday)!.push(c);
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
              <input name="name" className="input" placeholder={t("classPlaceholder")} readOnly />
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

/** Matches real memberships/page.tsx → NicheModulePage. */
export function GymMembershipsDemo() {
  const customers = useMemo(() => demoCustomers("gym"), []);
  const rows = useMemo(
    () => [
      {
        id: "m1",
        customer_id: customers[0]?.name || "Aina Rahman",
        plan_name: "Monthly",
        starts_on: "2026-07-05",
        ends_on: "2026-08-05",
        status: "active",
      },
      {
        id: "m2",
        customer_id: customers[1]?.name || "Lim Wei",
        plan_name: "Annual",
        starts_on: "2026-01-12",
        ends_on: "2027-01-12",
        status: "active",
      },
      {
        id: "m3",
        customer_id: customers[2]?.name || "Siti Aminah",
        plan_name: "Quarterly",
        starts_on: "2026-05-01",
        ends_on: "2026-08-01",
        status: "active",
      },
    ],
    [customers]
  );
  const columns = ["customer_id", "plan_name", "starts_on", "ends_on", "status"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Memberships" subtitle="Gym membership plans." />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Add</h3>
        <DemoNoopForm className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>Member ID</label>
              <input name="customer_id" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Plan</label>
              <input name="plan_name" className="input" type="text" readOnly />
            </div>
            <div className="field">
              <label>Starts</label>
              <input name="starts_on" className="input" type="date" readOnly />
            </div>
            <div className="field">
              <label>Ends</label>
              <input name="ends_on" className="input" type="date" readOnly />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </DemoNoopForm>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c}>{String(row[c] ?? "—")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Matches real checkins/page.tsx → NicheModulePage. */
export function GymCheckinsDemo() {
  const customers = useMemo(() => demoCustomers("gym"), []);
  const rows = useMemo(
    () => [
      {
        id: "k1",
        customer_id: customers[0]?.name || "Aina Rahman",
        checked_in_at: "2026-08-05T18:02:00+08:00",
      },
      {
        id: "k2",
        customer_id: customers[1]?.name || "Lim Wei",
        checked_in_at: "2026-08-05T18:15:00+08:00",
      },
      {
        id: "k3",
        customer_id: customers[2]?.name || "Siti Aminah",
        checked_in_at: "2026-08-05T19:01:00+08:00",
      },
    ],
    [customers]
  );
  const columns = ["customer_id", "checked_in_at"] as const;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title="Check-ins" subtitle="Gym member check-ins." />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Add</h3>
        <DemoNoopForm className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>Member ID</label>
              <input name="customer_id" className="input" type="text" readOnly />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </DemoNoopForm>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => (
                    <td key={c}>{String(row[c] ?? "—")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
