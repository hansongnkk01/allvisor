import { NicheModulePage } from "@/components/NicheModulePage";
import { createDiningTableAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "tables_kot",
    title: "Tables",
    subtitle: "Dining table map / status (F&B).",
    table: "dining_tables",
    columns: ["name","seats","status","created_at"],
    fields: [
  {
    "name": "name",
    "label": "Table name",
    "required": true
  },
  {
    "name": "seats",
    "label": "Seats",
    "type": "number",
    "defaultValue": 4
  }
],
    action: createDiningTableAction,
  });
}
