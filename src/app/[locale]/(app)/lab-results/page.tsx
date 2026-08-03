import { NicheModulePage } from "@/components/NicheModulePage";
import { createLabResultAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "lab_results",
    title: "Lab results",
    subtitle: "Diagnostic test results.",
    table: "lab_results",
    columns: ["customer_id","test_name","status","result_summary","created_at"],
    fields: [
  {
    "name": "customer_id",
    "label": "Customer ID",
    "required": true
  },
  {
    "name": "test_name",
    "label": "Test",
    "required": true
  },
  {
    "name": "status",
    "label": "Status",
    "defaultValue": "pending"
  },
  {
    "name": "result_summary",
    "label": "Summary"
  }
],
    action: createLabResultAction,
  });
}
