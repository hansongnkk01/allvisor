import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { createMedicalLetterAction } from "@/app/pipeline-actions";
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

  const [{ data: letters }, { data: customers }] = await Promise.all([
    supabase
      .from("medical_letters")
      .select("id, customer_id, letter_type, days_off, body, issued_on, created_by_name, created_at")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(80),
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
        title="MC / letters"
        subtitle="Issue medical certificates and referral letters."
      />
      <PipelineCreateForm
        action={createMedicalLetterAction}
        submitLabel="Issue letter"
        fields={[
          {
            name: "customer_id",
            label: "Patient",
            type: "select",
            required: true,
            options: (customers || []).map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: "letter_type",
            label: "Type",
            type: "select",
            options: [
              { value: "mc", label: "MC" },
              { value: "referral", label: "Referral" },
              { value: "fit_to_work", label: "Fit to work" },
              { value: "other", label: "Other" },
            ],
            defaultValue: "mc",
          },
          { name: "days_off", label: "Days off", type: "number", defaultValue: 1 },
          { name: "body", label: "Letter body", type: "textarea", required: true },
        ]}
      />
      <div className="surface" style={{ padding: "1.25rem", overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Recent letters</h3>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Issued</th>
              <th align="left">Patient</th>
              <th align="left">Type</th>
              <th align="left">Days</th>
              <th align="left">By</th>
              <th align="left">Body</th>
            </tr>
          </thead>
          <tbody>
            {(letters || []).map((row) => (
              <tr key={row.id}>
                <td>{row.issued_on || row.created_at?.slice(0, 10)}</td>
                <td>{customerMap.get(row.customer_id) || "—"}</td>
                <td>{row.letter_type}</td>
                <td>{row.days_off ?? "—"}</td>
                <td>{row.created_by_name || "—"}</td>
                <td style={{ maxWidth: 280, fontSize: "0.85rem" }}>{row.body}</td>
              </tr>
            ))}
            {!letters?.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  No letters yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
