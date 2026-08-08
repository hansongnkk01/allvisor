import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";

/** Student portal removed — old bookmarks go to Students. */
export default async function StudentAccountsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireOrg(locale);
  redirect({ href: "/customers", locale });
}
