import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { canAccessAdmin } from "@/lib/roles";

/** Settings content lives in Admin (same for clinic + retail). */
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await getTranslations("Settings");
  const ctx = await requireOrg(locale);

  if (canAccessAdmin(ctx.membership.role)) {
    redirect({ href: "/admin", locale });
  }

  redirect({ href: "/dashboard", locale });
}
