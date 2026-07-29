"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

export async function logActivity(input: {
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) return;
    const supabase = await createClient();
    await supabase.from("activity_logs").insert({
      organization_id: ctx.organization.id,
      actor_id: ctx.profile.id,
      actor_name: ctx.profile.full_name || ctx.profile.email || "Staff",
      action: input.action,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      summary: input.summary,
      meta: input.meta || null,
    });
  } catch {
    // never block primary action
  }
}
