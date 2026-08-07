import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/AppShell";
import { OrgProvider } from "@/components/OrgProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { isAdminZoneUnlocked } from "@/app/actions";
import { audienceForRole } from "@/lib/roles";
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
          orgLogoUrl={ctx.organization.logo_url}
          orgLogoShape={ctx.organization.logo_shape}
          role={ctx.membership.role}
          audience={audienceForRole(ctx.membership.role)}
          adminZoneUnlocked={adminZoneUnlocked}
        >
          {children}
        </AppShell>
      </ConfirmProvider>
    </OrgProvider>
  );
}
