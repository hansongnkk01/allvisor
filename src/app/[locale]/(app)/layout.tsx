import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/AppShell";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOrg(locale);

  return (
    <AppShell niche={ctx.organization.niche} orgName={ctx.organization.name}>
      {children}
    </AppShell>
  );
}
