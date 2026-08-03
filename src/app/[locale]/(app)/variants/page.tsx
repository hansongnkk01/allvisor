import { NicheModulePage } from "@/components/NicheModulePage";
import { createVariantAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "variants",
    title: "Variants",
    subtitle: "Size/color variants for fashion stock.",
    table: "product_variants",
    columns: ["product_id","size","color","sku","barcode","quantity"],
    fields: [
  {
    "name": "product_id",
    "label": "Product ID",
    "required": true
  },
  {
    "name": "size",
    "label": "Size"
  },
  {
    "name": "color",
    "label": "Color"
  },
  {
    "name": "sku",
    "label": "SKU"
  },
  {
    "name": "barcode",
    "label": "Barcode"
  },
  {
    "name": "quantity",
    "label": "Qty",
    "type": "number",
    "defaultValue": 0
  }
],
    action: createVariantAction,
  });
}
