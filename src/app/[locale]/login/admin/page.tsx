import { redirect } from "@/i18n/navigation";

/** Kept so older bookmarks and links still land on the admin entrance. */
export default async function LegacyAdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/admin/login", locale });
}
