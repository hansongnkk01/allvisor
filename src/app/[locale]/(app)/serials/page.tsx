import { NicheModulePage } from "@/components/NicheModulePage";
import { createSerialAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "serial_numbers",
    title: "Serial / IMEI",
    subtitle: "Track serialised electronics units.",
    table: "product_serials",
    columns: ["product_id","serial_number","status","created_at"],
    fields: [
  {
    "name": "product_id",
    "label": "Product ID",
    "required": true
  },
  {
    "name": "serial_number",
    "label": "Serial / IMEI",
    "required": true
  }
],
    action: createSerialAction,
  });
}
