import { NicheModulePage } from "@/components/NicheModulePage";
import { createEventPlanAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "event_timeline",
    title: "Events",
    subtitle: "Event plans and timelines.",
    table: "event_plans",
    columns: ["title","event_date","status","created_at"],
    fields: [
  {
    "name": "title",
    "label": "Event",
    "required": true
  },
  {
    "name": "event_date",
    "label": "Date",
    "type": "date"
  }
],
    action: createEventPlanAction,
  });
}
