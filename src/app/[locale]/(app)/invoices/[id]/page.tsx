import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";

/** Invoice detail opens as floating preview on the invoices list. */
export default async function InvoiceDetailRedirect({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireOrg(locale);
  redirect({ href: `/invoices?preview=${id}`, locale });
}
