import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { PosWorkspace, type PosProduct } from "@/components/PosWorkspace";

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
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [{ data: productsRaw, error: productsError }, { data: customers }, { data: movements }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, sku, barcode, unit_price, quantity")
        .eq("organization_id", ctx.organization.id)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("customers")
        .select("id, name")
        .eq("organization_id", ctx.organization.id)
        .order("name"),
      supabase
        .from("stock_movements")
        .select("product_id, quantity")
        .eq("organization_id", ctx.organization.id)
        .eq("type", "sale")
        .gte("created_at", since.toISOString())
        .limit(2000),
    ]);

  let products = productsRaw;
  if (productsError && /barcode/i.test(productsError.message)) {
    const fallback = await supabase
      .from("products")
      .select("id, name, sku, unit_price, quantity")
      .eq("organization_id", ctx.organization.id)
      .eq("is_active", true)
      .order("name");
    products = (fallback.data || []).map((p) => ({ ...p, barcode: null }));
  }

  const usage = new Map<string, number>();
  for (const m of movements || []) {
    const pid = m.product_id as string;
    if (!pid) continue;
    usage.set(pid, (usage.get(pid) || 0) + Number(m.quantity || 0));
  }
  const frequentIds = [...usage.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 12);

  const catalog: PosProduct[] = (products || []).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: (p as { barcode?: string | null }).barcode ?? null,
    unit_price: Number(p.unit_price),
    quantity: Number(p.quantity),
  }));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <PosWorkspace
        products={catalog}
        frequentIds={frequentIds}
        customers={customers || []}
        labels={{
          search: t("search"),
          searchHint: t("searchHint"),
          cart: t("cart"),
          total: t("total"),
          qty: t("qty"),
          customer: t("customer"),
          payment: t("payment"),
          cash: t("cash"),
          card: t("card"),
          ewallet: t("ewallet"),
          transfer: t("transfer"),
          checkout: t("checkout"),
          emptyCart: t("emptyCart"),
          add: t("add"),
          remove: t("remove"),
          frequent: t("frequent"),
          stock: t("stock"),
          success: t("success"),
          checkingOut: t("checkingOut"),
        }}
      />
    </div>
  );
}
