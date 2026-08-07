import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { vocabLabels } from "@/lib/niches";
import { loadLiveDashboardData } from "@/lib/load-live-dashboard";
import { StaffDashboardView } from "@/components/dashboards/StaffDashboardView";
import { staffDashLabelsFromT } from "@/lib/dashboard-labels";

export default async function StaffDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const ctx = await requireOrg(locale);
  const t = await getTranslations("Dashboard");
  const V = vocabLabels(ctx.organization.niche, locale);
  const data = await loadLiveDashboardData(ctx, { forAdmin: false });

  return (
    <>
      {sp.notice === "no-admin" ? (
        <div
          className="surface"
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "0.75rem",
            borderColor: "rgba(220,38,38,0.35)",
            background: "rgba(220,38,38,0.08)",
          }}
        >
          {t("noAdminAccess")}
        </div>
      ) : null}
      <StaffDashboardView
        mode="live"
        data={data}
        locale={locale}
        unpaidTotal={data.unpaidTotal}
        labels={staffDashLabelsFromT((k) => t(k as "welcome"), V.entityTitle)}
      />
    </>
  );
}
