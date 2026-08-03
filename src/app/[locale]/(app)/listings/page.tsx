import { NicheModulePage } from "@/components/NicheModulePage";
import { createListingAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "property_listings",
    title: "Listings",
    subtitle: "Property listings.",
    table: "property_listings",
    columns: ["title","status","notes","created_at"],
    fields: [
  {
    "name": "title",
    "label": "Title",
    "required": true
  },
  {
    "name": "notes",
    "label": "Notes"
  }
],
    action: createListingAction,
  });
}
