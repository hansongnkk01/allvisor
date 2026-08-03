import { redirect } from "@/i18n/navigation";

/** Student portal removed — old bookmarks go to Students. */
export default async function StudentAccountsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/customers", locale });
}
