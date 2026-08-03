import { NicheModulePage } from "@/components/NicheModulePage";
import { createShipmentAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "courier_tracking",
    title: "Shipments",
    subtitle: "Courier tracking.",
    table: "courier_shipments",
    columns: ["tracking_no","status","notes","created_at"],
    fields: [
  {
    "name": "tracking_no",
    "label": "Tracking #",
    "required": true
  },
  {
    "name": "notes",
    "label": "Notes"
  }
],
    action: createShipmentAction,
  });
}
