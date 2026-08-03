import { NicheModulePage } from "@/components/NicheModulePage";
import { createSalonCommissionAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "commissions",
    title: "Commissions",
    subtitle: "Staff commission rules for salon services.",
    table: "salon_commission_rules",
    columns: ["staff_name", "percent", "created_at"],
    fields: [
      { name: "staff_name", label: "Staff name", required: true },
      { name: "percent", label: "Percent", type: "number", defaultValue: 10 },
    ],
    action: createSalonCommissionAction,
  });
}
