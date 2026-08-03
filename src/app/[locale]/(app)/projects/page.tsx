import { NicheModulePage } from "@/components/NicheModulePage";
import { createProjectAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "project_claims",
    title: "Projects",
    subtitle: "Contractor projects / claims.",
    table: "contractor_projects",
    columns: ["name","status","claim_amount","created_at"],
    fields: [
  {
    "name": "name",
    "label": "Project",
    "required": true
  },
  {
    "name": "claim_amount",
    "label": "Claim amount",
    "type": "number",
    "defaultValue": 0
  }
],
    action: createProjectAction,
  });
}
