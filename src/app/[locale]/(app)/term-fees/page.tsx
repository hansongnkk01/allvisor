import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { ActionForm } from "@/components/ActionForm";
import {
  createTermFeeAction,
  invoiceTermFeeAction,
} from "@/app/pipeline-actions";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "term_fees");
  const supabase = await createClient();

  const [{ data: fees }, { data: customers }] = await Promise.all([
    supabase
      .from("tuition_term_fees")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(300),
  ]);

  const customerMap = new Map((customers || []).map((c) => [c.id, c.name]));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Term fees"
        subtitle="Tuition term billing — create fees and invoice outstanding balances."
      />
      <PipelineCreateForm
        action={createTermFeeAction}
        fields={[
          {
            name: "customer_id",
            label: "Student",
            type: "select",
            required: true,
            options: (customers || []).map((c) => ({ value: c.id, label: c.name })),
          },
          { name: "term_name", label: "Term name", required: true },
          { name: "total_amount", label: "Total (MYR)", type: "number", defaultValue: 0, required: true },
          { name: "due_on", label: "Due on", type: "date" },
        ]}
      />
      <div className="surface" style={{ padding: "1.25rem", overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Student</th>
              <th align="left">Term</th>
              <th align="left">Total</th>
              <th align="left">Paid</th>
              <th align="left">Due</th>
              <th align="left">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(fees || []).map((row) => {
              const outstanding = Number(row.total_amount) - Number(row.paid_amount);
              const overdue =
                row.due_on &&
                row.due_on < today &&
                outstanding > 0 &&
                row.status !== "paid";
              return (
                <tr
                  key={row.id}
                  style={overdue ? { background: "rgba(185,28,28,0.06)" } : undefined}
                >
                  <td>{customerMap.get(row.customer_id) || "—"}</td>
                  <td>{row.term_name}</td>
                  <td>{formatCurrency(Number(row.total_amount || 0))}</td>
                  <td>{formatCurrency(Number(row.paid_amount || 0))}</td>
                  <td>{row.due_on || "—"}</td>
                  <td>{row.status}</td>
                  <td>
                    {!row.invoice_id && outstanding > 0 ? (
                      <ActionForm action={invoiceTermFeeAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <button type="submit" className="btn btn-soft">
                          Create invoice
                        </button>
                      </ActionForm>
                    ) : row.invoice_id ? (
                      <span className="muted">Invoiced</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {!fees?.length ? (
              <tr>
                <td colSpan={7} className="muted">
                  No term fees yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
