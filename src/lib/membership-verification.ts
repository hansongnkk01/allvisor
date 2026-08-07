import type { MembershipRole } from "@/lib/types";

/**
 * Temporary code used while e-mail delivery is not wired up yet. Set
 * STAFF_VERIFICATION_CODE in the environment to change it.
 */
export const FALLBACK_VERIFICATION_CODE = "1234";

export function expectedVerificationCode(stored?: string | null) {
  if (stored && stored.trim()) return stored.trim();
  return (process.env.STAFF_VERIFICATION_CODE || FALLBACK_VERIFICATION_CODE).trim();
}

/** Owners created the business themselves, so they are trusted by definition. */
export function roleNeedsVerification(role: MembershipRole | string) {
  return role !== "owner";
}

type MinimalSupabase = { from: (table: string) => any };

/**
 * Reads the verification state without breaking installs where migration 026 has
 * not been applied yet: a missing column simply means nobody is gated.
 */
export async function getVerificationState({
  supabase,
  membershipId,
  role,
}: {
  supabase: MinimalSupabase;
  membershipId: string;
  role: MembershipRole | string;
}): Promise<{ required: boolean; storedCode: string | null }> {
  if (!roleNeedsVerification(role)) return { required: false, storedCode: null };

  const { data, error } = await supabase
    .from("memberships")
    .select("verified_at, verification_code")
    .eq("id", membershipId)
    .maybeSingle();

  if (error || !data) return { required: false, storedCode: null };

  return {
    required: !data.verified_at,
    storedCode: (data.verification_code as string | null) ?? null,
  };
}
