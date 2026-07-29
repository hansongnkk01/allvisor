import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { posCheckoutAction } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";

export default async function PosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("POS");
  const ctx = await requireOrg(locale);

  if (ctx.organization.niche !== "retail") {
    redirect({ href: "/dashboard", locale });
  }

  const supabase = await createClient();
  const [{ data: products }, { data: customers }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("customers")
      .select("id, name")
      .eq("organization_id", ctx.organization.id)
      .order("name"),
  ]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={t("success").split("—")[0]} />

      <div className="surface" style={{ padding: "1.25rem", maxWidth: 560 }}>
        <ActionForm action={posCheckoutAction} className="stack">
          <div className="field">
            <label>{t("selectProduct")}</label>
            <select name="product_id" required className="select">
              <option value="">—</option>
              {(products || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatCurrency(Number(p.unit_price))} · qty {p.quantity}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t("qty")}</label>
            <input name="quantity" type="number" min={1} defaultValue={1} required className="input" />
          </div>
          <div className="field">
            <label>{t("customer")}</label>
            <select name="customer_id" className="select">
              <option value="">—</option>
              {(customers || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("checkout")}
          </button>
        </ActionForm>
      </div>
    </div>
  );
}
