import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { StatusPipelineBoard } from "@/components/StatusPipelineBoard";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { createLabResultAction } from "@/app/niche-actions";
import {
  invoiceFromLabResultAction,
  updateLabResultStatusAction,
} from "@/app/pipeline-actions";
import { LAB_RESULT_STATUSES } from "@/lib/status-pipelines";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "lab_results");
  const supabase = await createClient();

  const [{ data: rows }, { data: customers }] = await Promise.all([
    supabase
      .from("lab_results")
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

  const items = (rows || []).map((row) => {
    const customer = row.customer_id ? customerMap.get(row.customer_id) : null;
    const resultBits = [
      row.result_value
        ? `${row.result_value}${row.result_unit ? ` ${row.result_unit}` : ""}`
        : null,
      row.reference_range ? `Ref ${row.reference_range}` : null,
      row.result_summary,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: row.id,
      title: row.test_name,
      status: row.status || "pending",
      subtitle: customer?.name || undefined,
      meta: resultBits || undefined,
      amountLabel: Number(row.amount || 0) > 0 ? formatCurrency(Number(row.amount)) : undefined,
      phone: customer?.phone,
      whatsappMessage:
        row.status === "ready" && customer
          ? `Hi ${customer.name}, your lab result for ${row.test_name} at ${ctx.organization.name} is ready for collection.`
          : undefined,
      invoiceId: row.invoice_id,
      tone: row.abnormal ? ("alert" as const) : row.status === "ready" ? ("good" as const) : undefined,
    };
  });

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Lab results"
        subtitle="Sample → processing → ready. WhatsApp when ready to collect."
      />
      <PipelineCreateForm
        action={createLabResultAction}
        fields={[
          { name: "test_name", label: "Test name", required: true },
          {
            name: "customer_id",
            label: "Customer",
            type: "select",
            required: true,
            options: (customers || []).map((c) => ({ value: c.id, label: c.name })),
          },
          { name: "amount", label: "Amount (MYR)", type: "number", defaultValue: 0 },
          { name: "result_value", label: "Result value" },
          { name: "result_unit", label: "Unit" },
          { name: "reference_range", label: "Reference range" },
          { name: "result_summary", label: "Summary", type: "textarea" },
        ]}
      />
      <StatusPipelineBoard
        statuses={LAB_RESULT_STATUSES}
        items={items}
        updateAction={updateLabResultStatusAction}
        invoiceAction={invoiceFromLabResultAction}
      />
    </div>
  );
}
