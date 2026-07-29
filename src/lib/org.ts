import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Membership, Organization, OrgContext, Profile } from "@/lib/types";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function requireUser(locale: string) {
  const { supabase, user } = await getSessionUser();
  if (!user) {
    redirect({ href: "/login", locale });
  }
  return { supabase, user: user! };
}

export async function getOrgContext(): Promise<OrgContext | null> {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("*, organizations(*), profiles(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.organizations) return null;

  return {
    membership: membership as Membership,
    organization: membership.organizations as unknown as Organization,
    profile: (membership.profiles as unknown as Profile) || {
      id: user.id,
      full_name: user.user_metadata?.full_name ?? null,
      email: user.email ?? null,
      locale: "ms",
      created_at: new Date().toISOString(),
    },
  };
}

export async function requireOrg(locale: string): Promise<OrgContext> {
  const { user } = await requireUser(locale);
  const ctx = await getOrgContext();
  if (!ctx) {
    redirect({ href: "/onboarding", locale });
  }
  // silence unused if redirect throws
  void user;
  return ctx!;
}
