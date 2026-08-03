import { redirect } from "@/i18n/navigation";

/** Student portal removed — send old links to staff login. */
export default async function StudentPortalRemoved({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/login", locale });
}
