import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { recordControlledDrugAction } from "@/app/pipeline-actions";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "rx_attach");
  const supabase = await createClient();

  const [{ data: logs }, { data: products }, { data: batches }, { data: customers }] =
    await Promise.all([
      supabase
        .from("controlled_drug_logs")
        .select("*")
        .eq("organization_id", ctx.organization.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("products")
        .select("id, name")
        .eq("organization_id", ctx.organization.id)
        .order("name")
        .limit(400),
      supabase
        .from("product_batches")
        .select("id, lot_number, product_id, expiry_date, quantity")
        .eq("organization_id", ctx.organization.id)
        .order("expiry_date", { ascending: true })
        .limit(300),
      supabase
        .from("customers")
        .select("id, name")
        .eq("organization_id", ctx.organization.id)
        .order("name")
        .limit(300),
    ]);

  const productMap = new Map((products || []).map((p) => [p.id, p.name]));
  const customerMap = new Map((customers || []).map((c) => [c.id, c.name]));
  const batchMap = new Map((batches || []).map((b) => [b.id, b]));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Controlled register"
        subtitle="Log controlled drug dispenses with product, batch and patient."
      />
      <PipelineCreateForm
        action={recordControlledDrugAction}
        submitLabel="Record dispense"
        fields={[
          {
            name: "product_id",
            label: "Product",
            type: "select",
            options: (products || []).map((p) => ({ value: p.id, label: p.name })),
          },
          {
            name: "batch_id",
            label: "Batch",
            type: "select",
            options: (batches || []).map((b) => ({
              value: b.id,
              label: `${b.lot_number}${b.expiry_date ? ` · exp ${b.expiry_date}` : ""} (${productMap.get(b.product_id) || "—"})`,
            })),
          },
          {
            name: "customer_id",
            label: "Patient",
            type: "select",
            options: (customers || []).map((c) => ({ value: c.id, label: c.name })),
          },
          { name: "quantity", label: "Qty", type: "number", defaultValue: 1, required: true },
          { name: "rx_reference", label: "Rx reference" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
      />
      <div className="surface" style={{ padding: "1.25rem", overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">When</th>
              <th align="left">Product</th>
              <th align="left">Batch</th>
              <th align="left">Patient</th>
              <th align="left">Qty</th>
              <th align="left">Rx</th>
              <th align="left">Staff</th>
            </tr>
          </thead>
          <tbody>
            {(logs || []).map((row) => {
              const batch = row.batch_id ? batchMap.get(row.batch_id) : null;
              return (
                <tr key={row.id}>
                  <td>{row.created_at?.slice(0, 16).replace("T", " ")}</td>
                  <td>{row.product_id ? productMap.get(row.product_id) || "—" : "—"}</td>
                  <td>{batch?.lot_number || "—"}</td>
                  <td>{row.customer_id ? customerMap.get(row.customer_id) || "—" : "—"}</td>
                  <td>{row.quantity}</td>
                  <td>{row.rx_reference || "—"}</td>
                  <td>{row.staff_name || "—"}</td>
                </tr>
              );
            })}
            {!logs?.length ? (
              <tr>
                <td colSpan={7} className="muted">
                  No controlled drug entries.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
