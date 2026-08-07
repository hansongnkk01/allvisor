import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { audienceForRole } from "@/lib/roles";

/** Kept so existing bookmarks and links keep working after the role split. */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOrg(locale);
  const href =
    audienceForRole(ctx.membership.role) === "admin"
      ? "/admin-dashboard"
      : "/staff-dashboard";
  redirect({ href, locale });
}
