import { NicheModulePage } from "@/components/NicheModulePage";
import { createWorkOrderAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "bom_wip",
    title: "Work orders",
    subtitle: "Manufacturing work orders.",
    table: "manufacturing_orders",
    columns: ["name","status","notes","created_at"],
    fields: [
  {
    "name": "name",
    "label": "Order",
    "required": true
  },
  {
    "name": "notes",
    "label": "Notes"
  }
],
    action: createWorkOrderAction,
  });
}
