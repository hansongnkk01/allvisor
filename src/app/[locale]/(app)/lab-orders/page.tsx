import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { StatusPipelineBoard } from "@/components/StatusPipelineBoard";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { createLabOrderAction } from "@/app/niche-actions";
import {
  invoiceFromLabOrderAction,
  updateLabOrderStatusAction,
} from "@/app/pipeline-actions";
import { LAB_ORDER_STATUSES } from "@/lib/status-pipelines";
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
  const ctx = await requireCapability(locale, "lab_orders");
  const supabase = await createClient();

  const [{ data: rows }, { data: customers }] = await Promise.all([
    supabase
      .from("optical_lab_orders")
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
  const today = new Date().toISOString().slice(0, 10);

  const items = (rows || []).map((row) => {
    const customer = row.customer_id ? customerMap.get(row.customer_id) : null;
    const overdue =
      row.expected_ready_on &&
      row.expected_ready_on < today &&
      !["ready", "collected"].includes(row.status);
    return {
      id: row.id,
      title: row.frame_name || row.lens_type || "Lab order",
      status: row.status || "pending",
      subtitle: [customer?.name, row.lens_type, row.coating].filter(Boolean).join(" · "),
      meta: [
        row.lab_name,
        row.expected_ready_on ? `Due ${row.expected_ready_on}` : null,
        Number(row.lab_cost || 0) > 0 ? `Cost ${formatCurrency(Number(row.lab_cost))}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
      amountLabel:
        Number(row.sell_price || 0) > 0 ? formatCurrency(Number(row.sell_price)) : undefined,
      phone: customer?.phone,
      whatsappMessage:
        row.status === "ready"
          ? readyForCollectionMsg(ctx.organization.name, row.frame_name || "glasses")
          : undefined,
      invoiceId: row.invoice_id,
      tone: overdue ? ("alert" as const) : undefined,
    };
  });

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Lab orders"
        subtitle="Ordered → in lab → ready → collected. Bill when ready."
      />
      <PipelineCreateForm
        action={createLabOrderAction}
        fields={[
          { name: "frame_name", label: "Frame", required: true },
          { name: "lens_type", label: "Lens type" },
          { name: "coating", label: "Coating" },
          {
            name: "customer_id",
            label: "Customer",
            type: "select",
            options: (customers || []).map((c) => ({ value: c.id, label: c.name })),
          },
          { name: "sell_price", label: "Sell price (MYR)", type: "number", defaultValue: 0 },
          { name: "lab_cost", label: "Lab cost (MYR)", type: "number", defaultValue: 0 },
          { name: "expected_ready_on", label: "Expected ready", type: "date" },
          { name: "lab_name", label: "Lab name" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
      />
      <StatusPipelineBoard
        statuses={LAB_ORDER_STATUSES}
        items={items}
        updateAction={updateLabOrderStatusAction}
        invoiceAction={invoiceFromLabOrderAction}
      />
    </div>
  );
}
