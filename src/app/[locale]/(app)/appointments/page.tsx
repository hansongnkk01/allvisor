import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { AppointmentBoard } from "@/components/AppointmentBoard";
import { createAppointmentAction } from "@/app/actions";
import type { AppointmentStatus } from "@/lib/types";

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
  const [{ data: appointments }, { data: customers }, { data: categories }] =
    await Promise.all([
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
      supabase
        .from("service_categories")
        .select("id, name")
        .eq("organization_id", ctx.organization.id)
        .order("name"),
    ]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr)",
          gap: "1rem",
          alignItems: "start",
        }}
        className="appointments-layout"
      >
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("add")}</h3>
          <ActionForm action={createAppointmentAction} className="stack">
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
              <label>{t("category")}</label>
              <select name="category_id" required className="select" defaultValue="">
                <option value="" disabled>
                  —
                </option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
            <div className="field">
              <label>{t("notes")}</label>
              <textarea name="notes" className="textarea" />
            </div>
            <label className="row" style={{ gap: "0.5rem" }}>
              <input type="checkbox" name="reminder_sent" />
              <span>{t("reminder")}</span>
            </label>
            <button type="submit" className="btn btn-primary" disabled={!categories?.length}>
              {t("save")}
            </button>
          </ActionForm>
          {!categories?.length ? (
            <p className="muted" style={{ marginTop: 8 }}>
              {t("needCategory")}
            </p>
          ) : null}
        </div>

        <div className="surface" style={{ padding: "1.25rem" }}>
          <AppointmentBoard
            appointments={(appointments || []).map((a) => ({
              id: a.id,
              title: a.title,
              starts_at: a.starts_at,
              ends_at: a.ends_at,
              status: a.status as AppointmentStatus,
              notes: a.notes,
              reminder_sent: a.reminder_sent,
              customers: a.customers,
            }))}
            labels={{
              calendar: t("calendar"),
              list: t("list"),
              today: t("today"),
              patient: t("patient"),
              status: t("status"),
              notes: t("notes"),
              reminder: t("reminder"),
              delete: t("delete"),
              empty: t("empty"),
              prev: t("prev"),
              next: t("next"),
              timetable: t("timetable"),
              occupied: t("occupied"),
              free: t("free"),
            }}
          />
        </div>
      </div>
    </div>
  );
}
