import { cache } from "react";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Membership, Organization, OrgContext, Profile } from "@/lib/types";

/** Dedupes auth lookup within a single server request. */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

export async function requireUser(locale: string) {
  const { supabase, user } = await getSessionUser();
  if (!user) {
    redirect({ href: "/login", locale });
  }
  return { supabase, user: user! };
}

/** Dedupes org membership lookup within a single server request (layout + page share one query). */
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select(
      "id, organization_id, user_id, role, created_at, organizations(id, name, niche, locale_default, tin, sst_number, lhdn_brn, lhdn_intermediary_linked, lhdn_intermediary_linked_at, address, phone, subscription_plan, subscription_status, trial_ends_at, admin_password_hash, clinic_open_hour, clinic_close_hour, closed_weekdays, service_charge_percent, invoice_prefix, invoice_next_seq, created_at), profiles(id, full_name, email, locale, created_at)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.organizations) return null;

  return {
    membership: membership as unknown as Membership,
    organization: membership.organizations as unknown as Organization,
    profile: (membership.profiles as unknown as Profile) || {
      id: user.id,
      full_name: user.user_metadata?.full_name ?? null,
      email: user.email ?? null,
      locale: "ms",
      created_at: new Date().toISOString(),
    },
  };
});

export async function requireOrg(locale: string): Promise<OrgContext> {
  await requireUser(locale);
  const ctx = await getOrgContext();
  if (!ctx) {
    redirect({ href: "/onboarding", locale });
  }
  return ctx!;
}
