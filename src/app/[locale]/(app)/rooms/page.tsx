import { NicheModulePage } from "@/components/NicheModulePage";
import { createHotelRoomAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "rooms",
    title: "Rooms",
    subtitle: "Hotel room inventory and status.",
    table: "hotel_rooms",
    columns: ["room_number","room_type","status","rate"],
    fields: [
  {
    "name": "room_number",
    "label": "Room #",
    "required": true
  },
  {
    "name": "room_type",
    "label": "Type",
    "defaultValue": "standard"
  },
  {
    "name": "rate",
    "label": "Rate",
    "type": "number",
    "defaultValue": 0
  }
],
    action: createHotelRoomAction,
  });
}
