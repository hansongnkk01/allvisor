import { NicheModulePage } from "@/components/NicheModulePage";
import { createPriceTierAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "price_tiers",
    title: "Price tiers",
    subtitle: "Wholesale customer discount tiers.",
    table: "price_tiers",
    columns: ["name","discount_percent","created_at"],
    fields: [
  {
    "name": "name",
    "label": "Tier name",
    "required": true
  },
  {
    "name": "discount_percent",
    "label": "Discount %",
    "type": "number",
    "defaultValue": 0
  }
],
    action: createPriceTierAction,
  });
}
