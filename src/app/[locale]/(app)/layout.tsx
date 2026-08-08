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

  // The cached org context skips this column (migration-safe); read it
  // directly so the owner chat only mounts when the flag truly exists and is on.
  let opsBrainEnabled = false;
  try {
    const { data: flagRow, error: flagError } = await supabase
      .from("organizations")
      .select("ops_brain_enabled")
      .eq("id", ctx.organization.id)
      .maybeSingle();
    opsBrainEnabled = !flagError && flagRow?.ops_brain_enabled === true;
  } catch {
    opsBrainEnabled = false;
  }

  return (
    <OrgProvider organization={ctx.organization} role={ctx.membership.role}>
      <ConfirmProvider>
        <AppShell
          niche={ctx.organization.niche}
          orgName={ctx.organization.name}
          orgLogoUrl={ctx.organization.logo_url}
          orgLogoShape={ctx.organization.logo_shape}
          audience={audienceForRole(ctx.membership.role)}
          adminZoneUnlocked={adminZoneUnlocked}
          opsBrainEnabled={opsBrainEnabled}
        >
          {children}
        </AppShell>
      </ConfirmProvider>
    </OrgProvider>
  );
}
