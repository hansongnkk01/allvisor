import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { StatusPipelineBoard } from "@/components/StatusPipelineBoard";
import { updateAppointmentQueueAction } from "@/app/pipeline-actions";
import { QUEUE_STATUSES } from "@/lib/status-pipelines";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "appointments");
  const supabase = await createClient();

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, title, starts_at, status, queue_status, room_name, assigned_staff, notes, customers(name, phone, allergies)"
    )
    .eq("organization_id", ctx.organization.id)
    .gte("starts_at", dayStart.toISOString())
    .lte("starts_at", dayEnd.toISOString())
    .order("starts_at", { ascending: true })
    .limit(200);

  const items = (appointments || [])
    .filter((row) => row.status !== "cancelled")
    .map((row) => {
      const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
      const queueStatus =
        row.queue_status ||
        (row.status === "completed"
          ? "completed"
          : row.status === "no_show"
            ? "no_show"
            : row.status === "confirmed" || row.status === "scheduled"
              ? "waiting"
              : "waiting");
      const time = row.starts_at
        ? new Date(row.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";
      return {
        id: row.id,
        title: customer?.name || row.title || "Patient",
        status: queueStatus,
        subtitle: [time, row.room_name, row.assigned_staff].filter(Boolean).join(" · "),
        meta: customer?.allergies
          ? `⚠ Allergies: ${customer.allergies}`
          : row.notes || undefined,
        phone: customer?.phone,
        tone: customer?.allergies
          ? ("alert" as const)
          : queueStatus === "waiting"
            ? ("muted" as const)
            : undefined,
      };
    });

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Today's queue"
        subtitle="Waiting → called → in room → completed. Allergy flags stay visible."
      />
      <StatusPipelineBoard
        statuses={QUEUE_STATUSES}
        items={items}
        updateAction={updateAppointmentQueueAction}
        showInvoice={false}
        emptyLabel="No patients in this column"
      />
    </div>
  );
}
