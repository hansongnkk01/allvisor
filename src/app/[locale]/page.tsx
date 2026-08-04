import { setRequestLocale } from "next-intl/server";
import { LandingClient } from "@/components/LandingClient";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LandingClient />;
}
