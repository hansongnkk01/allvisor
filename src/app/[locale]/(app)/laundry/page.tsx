import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { StatusPipelineBoard } from "@/components/StatusPipelineBoard";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { createLaundryTicketAction } from "@/app/niche-actions";
import {
  invoiceFromLaundryAction,
  updateLaundryStatusAction,
} from "@/app/pipeline-actions";
import { LAUNDRY_STATUSES } from "@/lib/status-pipelines";
import { formatCurrency } from "@/lib/utils";
import { readyForCollectionMsg } from "@/lib/whatsapp";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "laundry_tickets");
  const supabase = await createClient();

  const [{ data: tickets }, { data: customers }] = await Promise.all([
    supabase
      .from("laundry_tickets")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("customers")
      .select("id, name, phone")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(300),
  ]);

  const customerMap = new Map((customers || []).map((c) => [c.id, c]));
  const items = (tickets || []).map((row) => {
    const customer = row.customer_id ? customerMap.get(row.customer_id) : null;
    const ageHours = Math.floor(
      (Date.now() - new Date(row.created_at).getTime()) / 3_600_000
    );
    const overdue = row.status === "ready" && ageHours >= 48;
    return {
      id: row.id,
      title: row.ticket_number,
      status: row.status || "received",
      subtitle: [
        customer?.name,
        `${row.item_count || 1} items`,
        row.express ? "EXPRESS" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      meta: row.special_instructions || row.notes || `${ageHours}h in shop`,
      amountLabel: Number(row.amount || 0) > 0 ? formatCurrency(Number(row.amount)) : undefined,
      phone: customer?.phone,
      whatsappMessage:
        row.status === "ready"
          ? readyForCollectionMsg(ctx.organization.name, row.ticket_number)
          : undefined,
      invoiceId: row.invoice_id,
      tone: overdue || row.express ? ("alert" as const) : undefined,
    };
  });

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Laundry board"
        subtitle="Received → washing → ready → collected. Notify when ready."
      />
      <PipelineCreateForm
        action={createLaundryTicketAction}
        fields={[
          { name: "ticket_number", label: "Ticket #", required: true },
          {
            name: "customer_id",
            label: "Customer",
            type: "select",
            options: (customers || []).map((c) => ({ value: c.id, label: c.name })),
          },
          { name: "item_count", label: "Items", type: "number", defaultValue: 1 },
          { name: "amount", label: "Amount (MYR)", type: "number", defaultValue: 0 },
          {
            name: "express",
            label: "Express",
            type: "select",
            options: [
              { value: "false", label: "Normal" },
              { value: "true", label: "Express" },
            ],
            defaultValue: "false",
          },
          { name: "special_instructions", label: "Special instructions", type: "textarea" },
        ]}
      />
      <StatusPipelineBoard
        statuses={LAUNDRY_STATUSES}
        items={items}
        updateAction={updateLaundryStatusAction}
        invoiceAction={invoiceFromLaundryAction}
      />
    </div>
  );
}
