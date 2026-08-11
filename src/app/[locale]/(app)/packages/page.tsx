import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { ActionForm } from "@/components/ActionForm";
import { createSessionPackageAction } from "@/app/niche-actions";
import { useSessionPackageAction } from "@/app/pipeline-actions";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "session_packages");
  const supabase = await createClient();

  const [{ data: packages }, { data: customers }] = await Promise.all([
    supabase
      .from("session_packages")
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

  const customerMap = new Map((customers || []).map((c) => [c.id, c.name]));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Session packages"
        subtitle="Track remaining sessions for physio / salon packages."
      />
      <PipelineCreateForm
        action={createSessionPackageAction}
        fields={[
          {
            name: "customer_id",
            label: "Customer",
            type: "select",
            required: true,
            options: (customers || []).map((c) => ({ value: c.id, label: c.name })),
          },
          { name: "name", label: "Package name", required: true },
          { name: "total_sessions", label: "Total sessions", type: "number", defaultValue: 10 },
          { name: "expires_on", label: "Expires", type: "date" },
          { name: "price_paid", label: "Price paid (MYR)", type: "number", defaultValue: 0 },
        ]}
      />
      <div className="surface" style={{ padding: "1.25rem", overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Package</th>
              <th align="left">Customer</th>
              <th align="left">Remaining</th>
              <th align="left">Expires</th>
              <th align="left">Paid</th>
              <th align="left">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(packages || []).map((pkg) => {
              const remaining = Math.max(
                0,
                Number(pkg.total_sessions || 0) - Number(pkg.used_sessions || 0)
              );
              const expired =
                pkg.status === "expired" ||
                (pkg.expires_on && pkg.expires_on < today);
              return (
                <tr
                  key={pkg.id}
                  style={
                    remaining <= 1 || expired
                      ? { background: "rgba(185,28,28,0.06)" }
                      : undefined
                  }
                >
                  <td>{pkg.name}</td>
                  <td>{customerMap.get(pkg.customer_id) || "—"}</td>
                  <td>
                    {remaining} / {pkg.total_sessions}
                  </td>
                  <td>{pkg.expires_on || "—"}</td>
                  <td>
                    {Number(pkg.price_paid || 0) > 0
                      ? formatCurrency(Number(pkg.price_paid))
                      : "—"}
                  </td>
                  <td>{expired ? "expired" : pkg.status || "active"}</td>
                  <td>
                    {!expired && remaining > 0 ? (
                      <ActionForm action={useSessionPackageAction}>
                        <input type="hidden" name="package_id" value={pkg.id} />
                        <button type="submit" className="btn btn-soft">
                          Use session
                        </button>
                      </ActionForm>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {!packages?.length ? (
              <tr>
                <td colSpan={7} className="muted">
                  No packages yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
