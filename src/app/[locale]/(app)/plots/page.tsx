import { NicheModulePage } from "@/components/NicheModulePage";
import { createFarmPlotAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "farm_plots",
    title: "Plots",
    subtitle: "Farm plots and crops.",
    table: "farm_plots",
    columns: ["name","crop","status","created_at"],
    fields: [
  {
    "name": "name",
    "label": "Plot",
    "required": true
  },
  {
    "name": "crop",
    "label": "Crop"
  }
],
    action: createFarmPlotAction,
  });
}
