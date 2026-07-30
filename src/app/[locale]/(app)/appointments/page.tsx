import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { AppointmentBoard } from "@/components/AppointmentBoard";
import { SectionActivityLog } from "@/components/SectionActivityLog";
import { fetchSectionLogs } from "@/lib/section-logs";
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
  const [{ data: appointments }, { data: customers }, { data: categories }, logs] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("*, customers(name, risk_level)")
        .eq("organization_id", ctx.organization.id)
        .order("starts_at", { ascending: true }),
      supabase
        .from("customers")
        .select("id, name, risk_level")
        .eq("organization_id", ctx.organization.id)
        .order("name"),
      supabase
        .from("service_categories")
        .select("id, name")
        .eq("organization_id", ctx.organization.id)
        .order("name"),
      fetchSectionLogs(ctx.organization.id, ["appointment"]),
    ]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={t("bookHint")} />

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
          patients={(customers || []).map((c) => ({
            id: c.id,
            name: c.name,
            risk_level: c.risk_level,
          }))}
          categories={(categories || []).map((c) => ({
            id: c.id,
            name: c.name,
          }))}
          hoursConfig={{
            openHour: ctx.organization.clinic_open_hour ?? 0,
            closeHour: ctx.organization.clinic_close_hour ?? 23,
            closedWeekdays: ctx.organization.closed_weekdays || [],
            locale,
          }}
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
            closed: t("clinicClosed"),
            publicHoliday: t("publicHoliday"),
            edit: t("edit"),
            save: t("save"),
            cancel: t("cancel"),
            startsAt: t("startsAt"),
            endsAt: t("endsAt"),
            bookHint: t("bookHint"),
            pickStart: t("pickStart"),
            pickEnd: t("pickEnd"),
            pickPatient: t("pickPatient"),
            bookNow: t("bookNow"),
            category: t("category"),
            needCategory: t("needCategory"),
            resetBooking: t("resetBooking"),
          }}
        />
      </div>

      <SectionActivityLog title={t("activity")} logs={logs} />
    </div>
  );
}
