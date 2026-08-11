import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { ActionForm } from "@/components/ActionForm";
import { createPriceTierAction } from "@/app/niche-actions";
import { assignCustomerPriceTierAction } from "@/app/pipeline-actions";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "price_tiers");
  const supabase = await createClient();

  const [{ data: tiers }, { data: customers }] = await Promise.all([
    supabase
      .from("price_tiers")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("name"),
    supabase
      .from("customers")
      .select("id, name, price_tier_id")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(400),
  ]);

  const tierMap = new Map((tiers || []).map((t) => [t.id, t]));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Price tiers"
        subtitle="Invoice-first wholesale: assign tiers to customers, then bill. POS applies the tier automatically."
      />
      <PipelineCreateForm
        action={createPriceTierAction}
        fields={[
          { name: "name", label: "Tier name", required: true },
          { name: "discount_percent", label: "Discount %", type: "number", defaultValue: 0 },
        ]}
      />
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Tiers</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Discount %</th>
              </tr>
            </thead>
            <tbody>
              {(tiers || []).map((tier) => (
                <tr key={tier.id}>
                  <td>{tier.name}</td>
                  <td>{Number(tier.discount_percent)}%</td>
                </tr>
              ))}
              {!tiers?.length ? (
                <tr>
                  <td colSpan={2} className="muted">
                    No tiers yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Assign customer tier</h3>
        <ActionForm action={assignCustomerPriceTierAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>Customer</label>
              <select name="customer_id" className="select" required>
                <option value="">—</option>
                {(customers || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.price_tier_id && tierMap.get(c.price_tier_id)
                      ? ` (${tierMap.get(c.price_tier_id)!.name})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Tier</label>
              <select name="price_tier_id" className="select">
                <option value="">— None —</option>
                {(tiers || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({Number(t.discount_percent)}%)
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Assign tier
          </button>
        </ActionForm>
      </div>
    </div>
  );
}
