import { redirect } from "@/i18n/navigation";
import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { hasCapability, type Capability } from "@/lib/niche-capabilities";

export async function requireCapability(locale: string, capability: Capability) {
  const ctx = await getOrgContext();
  if (!ctx) {
    redirect({ href: "/login", locale });
  }
  if (!hasCapability(ctx!.organization.niche, capability)) {
    redirect({ href: "/dashboard", locale });
  }
  return { ...ctx!, supabase: await createClient() };
}

export async function requireMemberWithCapability(capability: Capability) {
  const ctx = await getOrgContext();
  if (!ctx) throw new Error("No organization");
  if (!hasCapability(ctx.organization.niche, capability)) {
    throw new Error(`This feature requires capability: ${capability}`);
  }
  return { ...ctx, supabase: await createClient() };
}
