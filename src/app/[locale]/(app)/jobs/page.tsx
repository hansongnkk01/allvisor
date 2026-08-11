import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { StatusPipelineBoard } from "@/components/StatusPipelineBoard";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { createJobCardAction } from "@/app/niche-actions";
import {
  invoiceFromJobAction,
  updateJobStatusAction,
} from "@/app/pipeline-actions";
import { JOB_STATUSES } from "@/lib/status-pipelines";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "job_cards");
  const supabase = await createClient();

  const [{ data: jobs }, { data: customers }, { data: vehicles }] = await Promise.all([
    supabase
      .from("job_cards")
      .select("id, title, status, customer_id, vehicle_id, labour_amount, parts_amount, assigned_to, notes, invoice_id, created_at, promised_at")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("customers")
      .select("id, name, phone")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(300),
    supabase
      .from("vehicles")
      .select("id, plate")
      .eq("organization_id", ctx.organization.id)
      .limit(200),
  ]);

  const customerMap = new Map((customers || []).map((c) => [c.id, c]));
  const vehicleMap = new Map((vehicles || []).map((v) => [v.id, v.plate]));

  const items = (jobs || []).map((job) => {
    const customer = job.customer_id ? customerMap.get(job.customer_id) : null;
    const amount = Number(job.labour_amount || 0) + Number(job.parts_amount || 0);
    const overdue =
      job.promised_at &&
      new Date(job.promised_at).getTime() < Date.now() &&
      !["delivered", "ready"].includes(job.status);
    return {
      id: job.id,
      title: job.title,
      status: job.status || "intake",
      subtitle: [customer?.name, job.vehicle_id ? vehicleMap.get(job.vehicle_id) : null, job.assigned_to]
        .filter(Boolean)
        .join(" · "),
      meta: job.notes || undefined,
      amountLabel: amount > 0 ? formatCurrency(amount) : undefined,
      phone: customer?.phone,
      whatsappMessage: customer
        ? `Hi ${customer.name}, update for job "${job.title}" at ${ctx.organization.name}: status is ${job.status}.`
        : undefined,
      invoiceId: job.invoice_id,
      tone: overdue ? ("alert" as const) : undefined,
    };
  });

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Job board"
        subtitle="Intake → parts → ready → bill. Keep unbilled ready jobs visible."
      />
      <PipelineCreateForm
        action={createJobCardAction}
        fields={[
          { name: "title", label: "Job title", required: true },
          {
            name: "customer_id",
            label: "Customer",
            type: "select",
            options: (customers || []).map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: "vehicle_id",
            label: "Vehicle",
            type: "select",
            options: (vehicles || []).map((v) => ({ value: v.id, label: v.plate })),
          },
          { name: "assigned_to", label: "Mechanic" },
          { name: "labour_amount", label: "Labour (MYR)", type: "number", defaultValue: 0 },
          { name: "parts_amount", label: "Parts (MYR)", type: "number", defaultValue: 0 },
          { name: "promised_at", label: "Promise date", type: "date" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
      />
      <StatusPipelineBoard
        statuses={JOB_STATUSES}
        items={items}
        updateAction={updateJobStatusAction}
        invoiceAction={invoiceFromJobAction}
      />
    </div>
  );
}
