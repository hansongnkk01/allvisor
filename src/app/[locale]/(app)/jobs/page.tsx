import { NicheModulePage } from "@/components/NicheModulePage";
import { createJobCardAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "job_cards",
    title: "Job cards",
    subtitle: "Workshop job board.",
    table: "job_cards",
    columns: ["title","status","vehicle_id","customer_id","created_at"],
    fields: [
  {
    "name": "title",
    "label": "Job title",
    "required": true
  },
  {
    "name": "status",
    "label": "Status",
    "defaultValue": "intake"
  },
  {
    "name": "vehicle_id",
    "label": "Vehicle ID"
  },
  {
    "name": "customer_id",
    "label": "Customer ID"
  },
  {
    "name": "notes",
    "label": "Notes"
  }
],
    action: createJobCardAction,
  });
}
