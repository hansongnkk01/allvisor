import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { canAccessAdmin } from "@/lib/roles";
import { vocabLabels } from "@/lib/niches";
import { loadLiveDashboardData } from "@/lib/load-live-dashboard";
import { AdminDashboardView } from "@/components/dashboards/AdminDashboardView";
import { adminDashLabelsFromT } from "@/lib/dashboard-labels";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOrg(locale);

  if (!canAccessAdmin(ctx.membership.role)) {
    redirect({ href: "/staff-dashboard", locale });
  }

  const t = await getTranslations("Dashboard");
  const V = vocabLabels(ctx.organization.niche, locale);
  const data = await loadLiveDashboardData(ctx, { forAdmin: true });

  return (
    <AdminDashboardView
      mode="live"
      data={data}
      locale={locale}
      labels={adminDashLabelsFromT((k) => t(k as "welcome"), V.entityTitle)}
    />
  );
}
