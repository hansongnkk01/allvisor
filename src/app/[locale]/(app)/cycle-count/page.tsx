import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { submitCycleCountAction } from "@/app/ops-brain-actions";
import { isOpsBrainEnabled } from "@/lib/ops-brain/enabled";
import { hasCapability } from "@/lib/niches";
import { redirect } from "@/i18n/navigation";
import { pickCycleCountSkus } from "@/lib/ops-brain/inventory";

export default async function CycleCountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");
  const ctx = await requireOrg(locale);

  if (!hasCapability(ctx.organization.niche, "inventory")) {
    redirect({ href: "/staff-dashboard", locale });
  }
  if (!isOpsBrainEnabled(ctx.organization)) {
    return (
      <div className="stack">
        <PageHeader title="Cycle count" subtitle={ctx.organization.name} />
        <p className="muted">Enable Ops Brain in Admin first.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const skus = await pickCycleCountSkus(supabase, ctx.organization.id, 8);

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader title="Cycle count" subtitle={t("aiTitle")} />
      <div className="surface" style={{ padding: "1rem" }}>
        <p className="muted">Submit counted quantity. System adjusts stock if different.</p>
        <div className="stack" style={{ gap: "0.85rem", marginTop: 12 }}>
          {skus.map((sku) => (
            <ActionForm key={sku.id} action={submitCycleCountAction} className="row" style={{ flexWrap: "wrap" }}>
              <input type="hidden" name="product_id" value={sku.id} />
              <div style={{ flex: "1 1 180px" }}>
                <strong>{sku.name}</strong>
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  System qty: {sku.quantity}
                </div>
              </div>
              <input
                name="counted_qty"
                type="number"
                min={0}
                step="0.001"
                className="input"
                defaultValue={sku.quantity}
                style={{ maxWidth: 120 }}
                required
              />
              <button type="submit" className="btn btn-primary">
                Submit
              </button>
            </ActionForm>
          ))}
          {!skus.length ? <p className="muted">No products to count.</p> : null}
        </div>
      </div>
    </div>
  );
}
