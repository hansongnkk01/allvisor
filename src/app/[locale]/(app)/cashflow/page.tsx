import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";

/** Cashflow merged into the owner Money page; kept so old links still work. */
export default async function CashflowPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireOrg(locale);
  redirect({ href: "/money", locale });
}
