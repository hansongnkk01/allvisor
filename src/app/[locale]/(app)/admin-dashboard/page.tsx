import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { canAccessOwnerArea } from "@/lib/roles";
import { loadLiveDashboard } from "@/lib/load-live-dashboard";
import { AdminDashboardView } from "@/components/dashboards/AdminDashboardView";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOrg(locale);
  if (!canAccessOwnerArea(ctx.membership.role)) {
    redirect({ href: "/staff-dashboard", locale });
  }
  const data = await loadLiveDashboard(locale);
  return <AdminDashboardView data={data} />;
}
