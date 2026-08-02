import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/AppShell";
import { OrgProvider } from "@/components/OrgProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { isAdminZoneUnlocked } from "@/app/actions";
import { setRequestLocale } from "next-intl/server";

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
  const adminZoneUnlocked = await isAdminZoneUnlocked();

  return (
    <OrgProvider organization={ctx.organization} role={ctx.membership.role}>
      <ConfirmProvider>
        <AppShell
          niche={ctx.organization.niche}
          orgName={ctx.organization.name}
          role={ctx.membership.role}
          adminZoneUnlocked={adminZoneUnlocked}
        >
          {children}
        </AppShell>
      </ConfirmProvider>
    </OrgProvider>
  );
}
