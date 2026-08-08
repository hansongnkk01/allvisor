import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgLogoUrl } from "@/lib/org-logo";
import type { Membership, Organization, OrgContext, Profile } from "@/lib/types";

/** Cookie set by the branch bar: which of the user's orgs is currently shown. */
export const ACTIVE_ORG_COOKIE = "allvisor_active_org";

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
const ORG_SELECT_WITH_INVOICE = `${ORG_SELECT_BASE}, invoice_prefix, invoice_next_seq, invoice_seq_digits, invoice_number_pattern`;
const ORG_SELECT_WITH_LOGO = `${ORG_SELECT_WITH_INVOICE}, logo_url, logo_shape`;
const ORG_SELECT_INVOICE_BASIC = `${ORG_SELECT_BASE}, invoice_prefix, invoice_next_seq`;
const MEMBERSHIP_SELECT = (orgFields: string) =>
  `id, organization_id, user_id, role, created_at, organizations(${orgFields}), profiles(id, full_name, email, locale, created_at)`;

type MembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: Membership["role"];
  created_at: string;
  organizations: Organization | Organization[] | null;
  profiles: Profile | Profile[] | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Membership lookup with a column ladder: migrations 017/015/014 may be
 * pending, so a schema-cache error retries with fewer org columns. When orgId
 * is given (branch bar selection), only a membership in THAT org qualifies —
 * a forged cookie simply finds nothing and the caller falls back.
 */
async function fetchMembershipWithFallback(
  supabase: SupabaseServerClient,
  userId: string,
  orgId: string | null
): Promise<MembershipRow | null> {
  for (const fields of [
    ORG_SELECT_WITH_LOGO,
    ORG_SELECT_WITH_INVOICE,
    ORG_SELECT_INVOICE_BASIC,
    ORG_SELECT_BASE,
  ]) {
    let query = supabase
      .from("memberships")
      .select(MEMBERSHIP_SELECT(fields))
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);
    if (orgId) query = query.eq("organization_id", orgId);
    const { data, error } = await query.maybeSingle();
    if (error) continue; // missing column — try a leaner select
    if (!data) return null; // no membership row at all
    const row = data as unknown as MembershipRow;
    if (row.organizations) return row;
    // embed came back empty — try a leaner select
  }
  return null;
}

/** Dedupes org membership lookup within a single server request (layout + page share one query). */
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;

  // Branch bar: honour the selected org when the user actually belongs to it.
  const preferredOrgId =
    (await cookies()).get(ACTIVE_ORG_COOKIE)?.value || null;

  let membership = preferredOrgId
    ? await fetchMembershipWithFallback(supabase, user.id, preferredOrgId)
    : null;
  if (!membership) {
    membership = await fetchMembershipWithFallback(supabase, user.id, null);
  }

  if (!membership?.organizations) return null;

  let organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;
  if (!organization) return null;

  // Always load logo fields separately (membership embed / schema cache may omit them).
  const { data: logoRow } = await supabase
    .from("organizations")
    .select("logo_url, logo_shape")
    .eq("id", organization.id)
    .maybeSingle();

  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? await (async () => {
        const { createClient: createAdminClient } = await import("@supabase/supabase-js");
        return createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
      })()
    : null;

  const resolvedLogoUrl = await resolveOrgLogoUrl(
    admin || supabase,
    organization.id,
    logoRow?.logo_url ?? null
  );

  organization = {
    ...organization,
    logo_url: resolvedLogoUrl,
    logo_shape: (logoRow?.logo_shape === "square" ? "square" : "round") as
      | "round"
      | "square",
  };

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
