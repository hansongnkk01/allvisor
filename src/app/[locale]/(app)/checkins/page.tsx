import { NicheModulePage } from "@/components/NicheModulePage";
import { createCheckinAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "class_checkin",
    title: "Check-ins",
    subtitle: "Gym member check-ins.",
    table: "gym_checkins",
    columns: ["customer_id","checked_in_at"],
    fields: [
  {
    "name": "customer_id",
    "label": "Member ID",
    "required": true
  }
],
    action: createCheckinAction,
  });
}
