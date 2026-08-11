import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { StatusPipelineBoard } from "@/components/StatusPipelineBoard";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { createShipmentAction } from "@/app/niche-actions";
import {
  invoiceFromShipmentAction,
  updateShipmentStatusAction,
} from "@/app/pipeline-actions";
import { SHIPMENT_STATUSES } from "@/lib/status-pipelines";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "courier_tracking");
  const supabase = await createClient();

  const [{ data: rows }, { data: customers }] = await Promise.all([
    supabase
      .from("courier_shipments")
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

  const items = (rows || []).map((row) => ({
    id: row.id,
    title: row.tracking_no,
    status: row.status || "created",
    subtitle: [row.receiver_name, row.rider_name, row.service_type]
      .filter(Boolean)
      .join(" · "),
    meta: [
      row.delivery_address,
      Number(row.cod_amount || 0) > 0
        ? `COD ${formatCurrency(Number(row.cod_amount))}${row.cod_collected ? " ✓" : ""}`
        : null,
      row.failed_reason,
      row.pod_note,
    ]
      .filter(Boolean)
      .join(" · "),
    amountLabel: Number(row.amount || 0) > 0 ? formatCurrency(Number(row.amount)) : undefined,
    phone: row.receiver_phone,
    whatsappMessage:
      row.status === "out_for_delivery"
        ? `Hi ${row.receiver_name || ""}, your parcel ${row.tracking_no} from ${ctx.organization.name} is out for delivery.`
        : undefined,
    invoiceId: row.invoice_id,
    tone:
      row.status === "failed" || (Number(row.cod_amount || 0) > 0 && !row.cod_collected && row.status === "delivered")
        ? ("alert" as const)
        : undefined,
  }));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Shipments"
        subtitle="POD + COD first. Bill only after delivered."
      />
      <PipelineCreateForm
        action={createShipmentAction}
        fields={[
          { name: "tracking_no", label: "Tracking #", required: true },
          {
            name: "customer_id",
            label: "Customer (sender)",
            type: "select",
            options: (customers || []).map((c) => ({ value: c.id, label: c.name })),
          },
          { name: "sender_name", label: "Sender name" },
          { name: "receiver_name", label: "Receiver name", required: true },
          { name: "receiver_phone", label: "Receiver phone" },
          { name: "pickup_address", label: "Pickup address" },
          { name: "delivery_address", label: "Delivery address", required: true },
          {
            name: "service_type",
            label: "Service",
            type: "select",
            options: [
              { value: "standard", label: "Standard" },
              { value: "same_day", label: "Same day" },
              { value: "express", label: "Express" },
            ],
            defaultValue: "standard",
          },
          { name: "weight_kg", label: "Weight (kg)", type: "number" },
          { name: "amount", label: "Delivery fee (MYR)", type: "number", defaultValue: 0 },
          { name: "cod_amount", label: "COD amount (MYR)", type: "number", defaultValue: 0 },
          { name: "rider_name", label: "Rider" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
      />
      <StatusPipelineBoard
        statuses={SHIPMENT_STATUSES}
        items={items}
        updateAction={updateShipmentStatusAction}
        invoiceAction={invoiceFromShipmentAction}
      />
    </div>
  );
}
