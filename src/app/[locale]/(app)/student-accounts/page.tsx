import { redirect } from "@/i18n/navigation";

/** Student accounts merged into Students (Customers) tab. */
export default async function StudentAccountsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/customers", locale });
}
