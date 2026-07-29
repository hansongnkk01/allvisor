import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { canAccessSensitive } from "@/lib/roles";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOrg(locale);
  redirect({
    href: canAccessSensitive(ctx.membership.role) ? "/admin" : "/dashboard",
    locale,
  });
}
