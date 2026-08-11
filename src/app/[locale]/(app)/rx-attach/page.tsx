import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { createPrescriptionAttachAction } from "@/app/pipeline-actions";
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

  const [{ data: rows }, { data: customers }] = await Promise.all([
    supabase
      .from("prescription_attachments")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(300),
  ]);

  const customerMap = new Map((customers || []).map((c) => [c.id, c.name]));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Rx attach"
        subtitle="Link prescription references to patients before dispensing."
      />
      <PipelineCreateForm
        action={createPrescriptionAttachAction}
        submitLabel="Attach Rx"
        fields={[
          {
            name: "customer_id",
            label: "Patient",
            type: "select",
            options: (customers || []).map((c) => ({ value: c.id, label: c.name })),
          },
          { name: "reference_no", label: "Rx reference", required: true },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
      />
      <div className="surface" style={{ padding: "1.25rem", overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">When</th>
              <th align="left">Patient</th>
              <th align="left">Reference</th>
              <th align="left">Dispensed</th>
              <th align="left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row) => (
              <tr key={row.id}>
                <td>{row.created_at?.slice(0, 16).replace("T", " ")}</td>
                <td>{row.customer_id ? customerMap.get(row.customer_id) || "—" : "—"}</td>
                <td>{row.reference_no}</td>
                <td>{row.dispensed ? "Yes" : "No"}</td>
                <td>{row.notes || "—"}</td>
              </tr>
            ))}
            {!rows?.length ? (
              <tr>
                <td colSpan={5} className="muted">
                  No prescription attachments.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
