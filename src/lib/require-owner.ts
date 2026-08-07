import { redirect } from "@/i18n/navigation";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { canAccessOwnerArea } from "@/lib/roles";

/**
 * Guard for the owner area. Staff, supervisor and manager are sent to their own
 * dashboard rather than shown an error, since the pages simply do not apply to them.
 */
export async function requireOwner(locale: string) {
  const ctx = await getOrgContext();
  if (!ctx) {
    redirect({ href: "/login", locale });
  }
  if (!canAccessOwnerArea(ctx!.membership.role)) {
    redirect({ href: "/staff-dashboard", locale });
  }
  return { ...ctx!, supabase: await createClient() };
}
