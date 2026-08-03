import { NicheModulePage } from "@/components/NicheModulePage";
import { createPetAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "pet_profiles",
    title: "Pets",
    subtitle: "Pet profiles linked to owners.",
    table: "pets",
    columns: ["name","species","breed","owner_id","created_at"],
    fields: [
  {
    "name": "owner_id",
    "label": "Owner customer ID",
    "required": true
  },
  {
    "name": "name",
    "label": "Pet name",
    "required": true
  },
  {
    "name": "species",
    "label": "Species"
  },
  {
    "name": "breed",
    "label": "Breed"
  },
  {
    "name": "notes",
    "label": "Notes"
  }
],
    action: createPetAction,
  });
}
