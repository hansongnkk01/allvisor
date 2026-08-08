import { NicheModulePage } from "@/components/NicheModulePage";
import { createMembershipAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "memberships",
    title: "Memberships",
    subtitle: "Gym membership plans.",
    table: "gym_memberships",
    columns: ["customer_id","plan_name","starts_on","ends_on","status"],
    fields: [
  {
    "name": "customer_id",
    "label": "Member ID",
    "required": true
  },
  {
    "name": "plan_name",
    "label": "Plan",
    "required": true
  },
  {
    "name": "starts_on",
    "label": "Starts",
    "type": "date"
  },
  {
    "name": "ends_on",
    "label": "Ends",
    "type": "date"
  }
],
    action: createMembershipAction,
  });
}
