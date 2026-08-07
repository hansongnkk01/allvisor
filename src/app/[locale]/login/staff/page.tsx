import { redirect } from "@/i18n/navigation";

/** Kept so older bookmarks and links still land on the staff entrance. */
export default async function LegacyStaffLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/staff/login", locale });
}
