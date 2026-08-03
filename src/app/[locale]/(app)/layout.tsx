import { requireOrg } from "@/lib/org";
import { getStudentContext } from "@/lib/tuition-student";
import { AppShell } from "@/components/AppShell";
import { OrgProvider } from "@/components/OrgProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { isAdminZoneUnlocked } from "@/app/actions";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Student-only accounts must not enter staff dashboard
  const student = await getStudentContext();
  if (student) {
    const { getOrgContext } = await import("@/lib/org");
    const org = await getOrgContext();
    if (!org) {
      redirect({ href: "/student", locale });
    }
  }

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
          adminZoneUnlocked={adminZoneUnlocked}
        >
          {children}
        </AppShell>
      </ConfirmProvider>
    </OrgProvider>
  );
}
