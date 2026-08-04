import { setRequestLocale } from "next-intl/server";
import { StartLandingClient } from "@/components/StartLandingClient";

export default async function StartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <StartLandingClient />;
}
