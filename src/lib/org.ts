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

const ORG_SELECT_BASE =
  "id, name, niche, locale_default, tin, sst_number, lhdn_brn, lhdn_intermediary_linked, lhdn_intermediary_linked_at, address, phone, subscription_plan, subscription_status, trial_ends_at, admin_password_hash, clinic_open_hour, clinic_close_hour, closed_weekdays, service_charge_percent, created_at";
const ORG_SELECT_WITH_INVOICE = `${ORG_SELECT_BASE}, invoice_prefix, invoice_next_seq`;
const MEMBERSHIP_SELECT = (orgFields: string) =>
  `id, organization_id, user_id, role, created_at, organizations(${orgFields}), profiles(id, full_name, email, locale, created_at)`;

/** Dedupes org membership lookup within a single server request (layout + page share one query). */
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;

  type MembershipRow = {
    id: string;
    organization_id: string;
    user_id: string;
    role: Membership["role"];
    created_at: string;
    organizations: Organization | Organization[] | null;
    profiles: Profile | Profile[] | null;
  };

  const full = await supabase
    .from("memberships")
    .select(MEMBERSHIP_SELECT(ORG_SELECT_WITH_INVOICE))
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let membership = full.data as MembershipRow | null;

  // Migration 014 may not be applied yet — retry without invoice format columns.
  if (full.error || !membership?.organizations) {
    const fallback = await supabase
      .from("memberships")
      .select(MEMBERSHIP_SELECT(ORG_SELECT_BASE))
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    membership = fallback.data as MembershipRow | null;
  }

  if (!membership?.organizations) return null;

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;
  if (!organization) return null;

  const profileRow = Array.isArray(membership.profiles)
    ? membership.profiles[0]
    : membership.profiles;

  return {
    membership: membership as unknown as Membership,
    organization,
    profile: profileRow || {
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
