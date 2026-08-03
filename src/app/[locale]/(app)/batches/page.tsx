import { NicheModulePage } from "@/components/NicheModulePage";
import { createProductBatchAction } from "@/app/niche-actions";
import { requireCapability } from "@/lib/require-capability";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "batch_expiry");
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .eq("organization_id", ctx.organization.id)
    .order("name");
  return NicheModulePage({
    params,
    capability: "batch_expiry",
    title: "Batches / expiry",
    subtitle: "Lot tracking and expiry for pharmacy inventory.",
    table: "product_batches",
    columns: ["lot_number", "product_id", "expiry_date", "quantity"],
    fields: [
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
    ],
    action: createProductBatchAction,
  });
}
