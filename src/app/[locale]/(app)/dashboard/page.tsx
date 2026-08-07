import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { canAccessAdmin } from "@/lib/roles";

/** Legacy alias — routes to role-specific dashboards. */
export default async function DashboardRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOrg(locale);
  if (canAccessAdmin(ctx.membership.role)) {
    redirect({ href: "/admin-dashboard", locale });
  }
  redirect({ href: "/staff-dashboard", locale });
}
