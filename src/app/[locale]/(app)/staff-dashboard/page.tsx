import { setRequestLocale } from "next-intl/server";
import { loadLiveDashboard } from "@/lib/load-live-dashboard";
import { StaffDashboardView } from "@/components/dashboards/StaffDashboardView";

export default async function StaffDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = await loadLiveDashboard(locale);
  return <StaffDashboardView data={data} />;
}
