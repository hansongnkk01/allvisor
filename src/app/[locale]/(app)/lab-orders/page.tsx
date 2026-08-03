import { NicheModulePage } from "@/components/NicheModulePage";
import { createLabOrderAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "lab_orders",
    title: "Lab orders",
    subtitle: "Frame/lens lab order tracking.",
    table: "optical_lab_orders",
    columns: ["frame_name","status","customer_id","created_at"],
    fields: [
  {
    "name": "customer_id",
    "label": "Customer ID"
  },
  {
    "name": "frame_name",
    "label": "Frame"
  },
  {
    "name": "status",
    "label": "Status",
    "defaultValue": "pending"
  },
  {
    "name": "notes",
    "label": "Notes"
  }
],
    action: createLabOrderAction,
  });
}
