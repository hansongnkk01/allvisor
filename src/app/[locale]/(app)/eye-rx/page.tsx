import { NicheModulePage } from "@/components/NicheModulePage";
import { createEyeRxAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "eye_rx",
    title: "Eye prescriptions",
    subtitle: "Optical Rx records per customer.",
    table: "eye_prescriptions",
    columns: ["customer_id","od_sph","os_sph","pd","created_at"],
    fields: [
  {
    "name": "customer_id",
    "label": "Customer ID",
    "required": true
  },
  {
    "name": "od_sph",
    "label": "OD SPH"
  },
  {
    "name": "od_cyl",
    "label": "OD CYL"
  },
  {
    "name": "od_axis",
    "label": "OD Axis"
  },
  {
    "name": "os_sph",
    "label": "OS SPH"
  },
  {
    "name": "os_cyl",
    "label": "OS CYL"
  },
  {
    "name": "os_axis",
    "label": "OS Axis"
  },
  {
    "name": "pd",
    "label": "PD"
  },
  {
    "name": "notes",
    "label": "Notes"
  }
],
    action: createEyeRxAction,
  });
}
