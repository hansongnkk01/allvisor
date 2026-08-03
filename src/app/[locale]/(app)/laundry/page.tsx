import { NicheModulePage } from "@/components/NicheModulePage";
import { createLaundryTicketAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "laundry_tickets",
    title: "Laundry tickets",
    subtitle: "Drop-off / ready / pickup tickets.",
    table: "laundry_tickets",
    columns: ["ticket_number","status","item_count","customer_id","created_at"],
    fields: [
  {
    "name": "ticket_number",
    "label": "Ticket #"
  },
  {
    "name": "customer_id",
    "label": "Customer ID"
  },
  {
    "name": "item_count",
    "label": "Items",
    "type": "number",
    "defaultValue": 1
  },
  {
    "name": "notes",
    "label": "Notes"
  }
],
    action: createLaundryTicketAction,
  });
}
