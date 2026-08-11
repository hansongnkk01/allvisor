import { requireOrg } from "@/lib/org";
import { AppShell } from "@/components/AppShell";
import { OrgProvider } from "@/components/OrgProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { isAdminZoneUnlocked } from "@/app/actions";
import { audienceForRole } from "@/lib/roles";
import { setRequestLocale } from "next-intl/server";
import { VerifyAccountGate } from "@/components/VerifyAccountGate";
import {
  expectedVerificationCode,
  getVerificationState,
} from "@/lib/membership-verification";
import { createClient } from "@/lib/supabase/server";

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

  // Gate the whole app, not just the dashboard, so nothing leaks before confirming.
  const supabase = await createClient();
  const verification = await getVerificationState({
    supabase,
    membershipId: ctx.membership.id,
    role: ctx.membership.role,
  });
  if (verification.required) {
    return (
      <VerifyAccountGate
        email={ctx.profile.email}
        orgName={ctx.organization.name}
        devCode={
          process.env.STAFF_VERIFICATION_CODE
            ? null
            : expectedVerificationCode(verification.storedCode)
        }
      />
    );
  }

  const adminZoneUnlocked = await isAdminZoneUnlocked();

  // The AI supervisor is always on (the ops_brain_enabled column remains in
  // the schema but is no longer consulted).
  const opsBrainEnabled = true;

  // Branch bar: every org this account belongs to. 2+ orgs → the bar shows.
  const { data: myMemberships } = await supabase
    .from("memberships")
    .select("organization_id, organizations(name)")
    .eq("user_id", ctx.membership.user_id)
    .order("created_at", { ascending: true });
  const branches = (myMemberships || []).map((row) => {
    const org = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations;
    return {
      id: String(row.organization_id),
      name: String((org as { name?: string } | null)?.name || "Branch"),
    };
  });

  return (
    <OrgProvider
      organization={{
        id: ctx.organization.id,
        name: ctx.organization.name,
        niche: ctx.organization.niche,
      }}
      role={ctx.membership.role}
    >
      <ConfirmProvider>
        <AppShell
          niche={ctx.organization.niche}
          orgName={ctx.organization.name}
          orgLogoUrl={ctx.organization.logo_url}
          orgLogoShape={ctx.organization.logo_shape}
          audience={audienceForRole(ctx.membership.role)}
          adminZoneUnlocked={adminZoneUnlocked}
          opsBrainEnabled={opsBrainEnabled}
          branches={branches}
          activeOrgId={ctx.organization.id}
        >
          {children}
        </AppShell>
      </ConfirmProvider>
    </OrgProvider>
  );
}
