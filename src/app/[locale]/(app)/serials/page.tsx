import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { StatusPipelineBoard } from "@/components/StatusPipelineBoard";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { createSerialAction } from "@/app/niche-actions";
import { updateSerialStatusAction } from "@/app/pipeline-actions";
import { SERIAL_STATUSES } from "@/lib/status-pipelines";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "serial_numbers");
  const supabase = await createClient();

  const [{ data: serials }, { data: products }] = await Promise.all([
    supabase
      .from("product_serials")
      .select("id, product_id, serial_number, status, warranty_months, warranty_ends_on, sold_at, notes, created_at")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("products")
      .select("id, name")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(400),
  ]);

  const productMap = new Map((products || []).map((p) => [p.id, p.name]));

  const items = (serials || []).map((row) => ({
    id: row.id,
    title: row.serial_number,
    status: row.status || "in_stock",
    subtitle: [productMap.get(row.product_id), row.warranty_months ? `${row.warranty_months} mo warranty` : null]
      .filter(Boolean)
      .join(" · "),
    meta: [row.warranty_ends_on ? `Ends ${row.warranty_ends_on}` : null, row.notes]
      .filter(Boolean)
      .join(" · ") || undefined,
    tone: row.status === "defective" ? ("alert" as const) : undefined,
  }));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Serial / IMEI"
        subtitle="Track serialised units from stock through sale and returns."
      />
      <PipelineCreateForm
        action={createSerialAction}
        fields={[
          {
            name: "product_id",
            label: "Product",
            type: "select",
            required: true,
            options: (products || []).map((p) => ({ value: p.id, label: p.name })),
          },
          { name: "serial_number", label: "Serial / IMEI", required: true },
          { name: "warranty_months", label: "Warranty (months)", type: "number", defaultValue: 12 },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
      />
      <StatusPipelineBoard
        statuses={SERIAL_STATUSES}
        items={items}
        updateAction={updateSerialStatusAction}
        showInvoice={false}
      />
    </div>
  );
}
