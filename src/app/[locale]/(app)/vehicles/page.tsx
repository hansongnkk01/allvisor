import { NicheModulePage } from "@/components/NicheModulePage";
import { createVehicleAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "vehicle_profile",
    title: "Vehicles",
    subtitle: "Customer vehicles for workshop jobs.",
    table: "vehicles",
    columns: ["plate","make","model","year","customer_id"],
    fields: [
  {
    "name": "plate",
    "label": "Plate",
    "required": true
  },
  {
    "name": "make",
    "label": "Make"
  },
  {
    "name": "model",
    "label": "Model"
  },
  {
    "name": "year",
    "label": "Year"
  },
  {
    "name": "customer_id",
    "label": "Customer ID"
  }
],
    action: createVehicleAction,
  });
}
