import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

/** Invoice detail opens as floating preview on the invoices list. */
export default async function InvoiceDetailRedirect({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  redirect({ href: `/invoices?preview=${id}`, locale });
}
