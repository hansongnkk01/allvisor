import { setRequestLocale } from "next-intl/server";
import { requireCapability } from "@/lib/require-capability";
import { PageHeader } from "@/components/PageHeader";
import { PipelineCreateForm } from "@/components/PipelineCreateForm";
import { createProductBatchAction } from "@/app/niche-actions";
import { createClient } from "@/lib/supabase/server";

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "batch_expiry");
  const supabase = await createClient();

  const [{ data: batches }, { data: products }] = await Promise.all([
    supabase
      .from("product_batches")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .limit(200),
    supabase
      .from("products")
      .select("id, name")
      .eq("organization_id", ctx.organization.id)
      .order("name")
      .limit(400),
  ]);

  const productMap = new Map((products || []).map((p) => [p.id, p.name]));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title="Batches / expiry"
        subtitle="FEFO view — earliest expiry first. Alert within 30 days."
      />
      <PipelineCreateForm
        action={createProductBatchAction}
        fields={[
          {
            name: "product_id",
            label: "Product",
            type: "select",
            required: true,
            options: (products || []).map((p) => ({ value: p.id, label: p.name })),
          },
          { name: "lot_number", label: "Lot number", required: true },
          { name: "expiry_date", label: "Expiry", type: "date" },
          { name: "quantity", label: "Qty", type: "number", defaultValue: 0 },
        ]}
      />
      <div className="surface" style={{ padding: "1.25rem", overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Product</th>
              <th align="left">Lot</th>
              <th align="left">Expiry</th>
              <th align="left">Days left</th>
              <th align="left">Qty</th>
            </tr>
          </thead>
          <tbody>
            {(batches || []).map((row) => {
              const days = daysUntil(row.expiry_date);
              const alert = days !== null && days <= 30;
              const expired = days !== null && days < 0;
              return (
                <tr
                  key={row.id}
                  style={
                    expired
                      ? { background: "rgba(185,28,28,0.12)" }
                      : alert
                        ? { background: "rgba(185,28,28,0.06)" }
                        : undefined
                  }
                >
                  <td>{productMap.get(row.product_id) || "—"}</td>
                  <td>{row.lot_number}</td>
                  <td>{row.expiry_date || "—"}</td>
                  <td>
                    {days === null ? (
                      "—"
                    ) : expired ? (
                      <span style={{ color: "var(--danger)", fontWeight: 600 }}>
                        Expired {Math.abs(days)}d
                      </span>
                    ) : alert ? (
                      <span style={{ color: "var(--danger)", fontWeight: 600 }}>{days}d</span>
                    ) : (
                      `${days}d`
                    )}
                  </td>
                  <td>{row.quantity}</td>
                </tr>
              );
            })}
            {!batches?.length ? (
              <tr>
                <td colSpan={5} className="muted">
                  No batches yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
