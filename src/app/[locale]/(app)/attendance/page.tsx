import { NicheModulePage } from "@/components/NicheModulePage";
import { createAttendanceAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "attendance",
    title: "Attendance",
    subtitle: "Mark student attendance.",
    table: "tuition_attendance",
    columns: ["class_id","customer_id","attended_on","present"],
    fields: [
  {
    "name": "class_id",
    "label": "Class ID",
    "required": true
  },
  {
    "name": "customer_id",
    "label": "Student ID",
    "required": true
  },
  {
    "name": "attended_on",
    "label": "Date",
    "type": "date"
  }
],
    action: createAttendanceAction,
  });
}
