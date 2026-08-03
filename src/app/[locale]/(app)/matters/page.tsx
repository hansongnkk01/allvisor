import { NicheModulePage } from "@/components/NicheModulePage";
import { createMatterAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "matter_billing",
    title: "Matters",
    subtitle: "Legal matters / retainers.",
    table: "legal_matters",
    columns: ["title","status","notes","created_at"],
    fields: [
  {
    "name": "title",
    "label": "Matter",
    "required": true
  },
  {
    "name": "notes",
    "label": "Notes"
  }
],
    action: createMatterAction,
  });
}
