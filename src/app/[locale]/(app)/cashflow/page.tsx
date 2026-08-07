import { redirect } from "@/i18n/navigation";

/** Cashflow merged into the owner Money page; kept so old links still work. */
export default async function CashflowPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/money", locale });
}
