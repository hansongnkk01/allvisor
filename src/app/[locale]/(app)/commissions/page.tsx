import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { createSalonCommissionAction } from "@/app/niche-actions";
import { recordCommissionEntryAction } from "@/app/pipeline-actions";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "commissions");
  const supabase = await createClient();

  const [{ data: rules }, { data: entries }] = await Promise.all([
    supabase
      .from("salon_commission_rules")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("salon_commission_entries")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(150),
  ]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Commissions"
        subtitle="Staff commission rules and earned entries."
      />
      <PipelineCreateForm
        action={createSalonCommissionAction}
        submitLabel="Add rule"
        fields={[
          { name: "staff_name", label: "Staff name", required: true },
          { name: "percent", label: "Percent", type: "number", defaultValue: 10 },
        ]}
      />
      <div className="surface" style={{ padding: "1.25rem", overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Rules</h3>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Staff</th>
              <th align="left">Percent</th>
              <th align="left">Created</th>
            </tr>
          </thead>
          <tbody>
            {(rules || []).map((row) => (
              <tr key={row.id}>
                <td>{row.staff_name}</td>
                <td>{row.percent}%</td>
                <td>{row.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
            {!rules?.length ? (
              <tr>
                <td colSpan={3} className="muted">
                  No commission rules.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <PipelineCreateForm
        action={recordCommissionEntryAction}
        submitLabel="Record entry"
        fields={[
          { name: "staff_name", label: "Staff name", required: true },
          { name: "amount", label: "Amount (MYR)", type: "number", defaultValue: 0, required: true },
          { name: "note", label: "Note", type: "textarea" },
        ]}
      />
      <div className="surface" style={{ padding: "1.25rem", overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Entries</h3>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Date</th>
              <th align="left">Staff</th>
              <th align="left">Amount</th>
              <th align="left">Source</th>
              <th align="left">Note</th>
            </tr>
          </thead>
          <tbody>
            {(entries || []).map((row) => (
              <tr key={row.id}>
                <td>{row.earned_on || row.created_at?.slice(0, 10)}</td>
                <td>{row.staff_name}</td>
                <td>{formatCurrency(Number(row.amount || 0))}</td>
                <td>{row.source_type || "—"}</td>
                <td>{row.note || "—"}</td>
              </tr>
            ))}
            {!entries?.length ? (
              <tr>
                <td colSpan={5} className="muted">
                  No commission entries.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
