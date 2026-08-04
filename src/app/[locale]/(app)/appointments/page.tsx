import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { AppointmentBoardLazy } from "@/components/AppointmentBoardLazy";
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

  const { hasCapability, getNicheVocab, vocabLabels } = await import("@/lib/niches");
  if (!hasCapability(ctx.organization.niche, "appointments")) {
    redirect({ href: "/dashboard", locale });
  }
  const vocab = getNicheVocab(ctx.organization.niche);
  const V = vocabLabels(ctx.organization.niche, locale);
  const entityCap = V.entity.replace(/\b\w/g, (c) => c.toUpperCase());

  const supabase = await createClient();
  // Calendar window: ~45 days back + ~90 days ahead (keeps payload small)
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 45);
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + 90);

  const [{ data: appointments }, { data: customers }, { data: categories }, logs] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, title, starts_at, ends_at, status, notes, reminder_sent, customers(name, risk_level, allergies)"
        )
        .eq("organization_id", ctx.organization.id)
        .gte("starts_at", windowStart.toISOString())
        .lte("starts_at", windowEnd.toISOString())
        .order("starts_at", { ascending: true })
        .limit(500),
      supabase
        .from("customers")
        .select("id, name, risk_level, allergies")
        .eq("organization_id", ctx.organization.id)
        .order("name")
        .limit(500),
      supabase
        .from("service_categories")
        .select("id, name")
        .eq("organization_id", ctx.organization.id)
        .order("name")
        .limit(200),
      fetchSectionLogs(ctx.organization.id, ["appointment"], 25),
    ]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={V.schedule} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <AppointmentBoardLazy
          appointments={(appointments || []).map((a) => ({
            id: a.id,
            title: a.title,
            starts_at: a.starts_at,
            ends_at: a.ends_at,
            status: a.status as AppointmentStatus,
            notes: a.notes,
            reminder_sent: a.reminder_sent,
            customers: Array.isArray(a.customers)
              ? a.customers[0] || null
              : a.customers,
          }))}
          patients={(customers || []).map((c) => ({
            id: c.id,
            name: c.name,
            risk_level: vocab.showRisk ? c.risk_level : null,
            allergies: vocab.showAllergies ? c.allergies : null,
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
            patient: entityCap,
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
            closed: `${V.businessTitle} closed`,
            publicHoliday: t("publicHoliday"),
            edit: t("edit"),
            save: t("save"),
            cancel: t("cancel"),
            startsAt: t("startsAt"),
            endsAt: t("endsAt"),
            bookHint: t("bookHint").replace(/patient/gi, V.entity),
            pickStart: t("pickStart"),
            pickEnd: t("pickEnd"),
            pickPatient: `Choose ${V.entity} & category, then book`,
            bookNow: t("bookNow"),
            category: t("category"),
            needCategory: t("needCategory"),
            resetBooking: t("resetBooking"),
            searchPatient: `Type to search ${V.entity}…`,
            searchCategory: t("searchCategory"),
            completeConfirm1: t("completeConfirm1"),
            completeConfirm2: t("completeConfirm2"),
          }}
        />
      </div>

      <SectionActivityLog title={t("activity")} logs={logs} pageSize={5} />
    </div>
  );
}