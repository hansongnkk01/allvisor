import { NicheModulePage } from "@/components/NicheModulePage";
import { createTuitionClassAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "class_schedule",
    title: "Classes",
    subtitle: "Class schedule and fees.",
    table: "tuition_classes",
    columns: ["name","schedule","fee","created_at"],
    fields: [
  {
    "name": "name",
    "label": "Class name",
    "required": true
  },
  {
    "name": "schedule",
    "label": "Schedule"
  },
  {
    "name": "fee",
    "label": "Fee",
    "type": "number",
    "defaultValue": 0
  }
],
    action: createTuitionClassAction,
  });
}
