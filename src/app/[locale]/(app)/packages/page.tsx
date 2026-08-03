import { NicheModulePage } from "@/components/NicheModulePage";
import { createSessionPackageAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "session_packages",
    title: "Session packages",
    subtitle: "Physio / package session tracking.",
    table: "session_packages",
    columns: ["customer_id","name","total_sessions","used_sessions"],
    fields: [
  {
    "name": "customer_id",
    "label": "Customer ID",
    "required": true
  },
  {
    "name": "name",
    "label": "Package",
    "required": true
  },
  {
    "name": "total_sessions",
    "label": "Total sessions",
    "type": "number",
    "defaultValue": 10
  }
],
    action: createSessionPackageAction,
  });
}
