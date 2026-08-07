import type { AlertSeverity, SupabaseClientLike } from "./types-internal";

/** Minimal insert shape — uses any supabase client with .from() */
export async function insertAlert(
  supabase: SupabaseClientLike,
  input: {
    organizationId: string;
    type: string;
    severity: AlertSeverity;
    title: string;
    message: string;
    relatedStaffId?: string | null;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    metadata?: Record<string, unknown>;
    escalate?: boolean;
  }
): Promise<{ id?: string; error?: string }> {
  try {
    const row = {
      organization_id: input.organizationId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      status: "open" as const,
      related_staff_id: input.relatedStaffId || null,
      related_entity_type: input.relatedEntityType || null,
      related_entity_id: input.relatedEntityId || null,
      metadata: input.metadata || {},
      escalated_at: input.escalate || input.severity === "high" ? new Date().toISOString() : null,
    };
    const { data, error } = await supabase
      .from("alerts")
      .insert(row)
      .select("id")
      .single();
    if (error) return { error: error.message };
    return { id: data?.id as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "alert insert failed" };
  }
}

/** Avoid duplicate open alerts of same type+staff within lookback hours. */
export async function hasRecentOpenAlert(
  supabase: SupabaseClientLike,
  organizationId: string,
  type: string,
  relatedStaffId: string | null | undefined,
  lookbackHours = 24
): Promise<boolean> {
  try {
    const since = new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString();
    let q = supabase
      .from("alerts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("type", type)
      .in("status", ["open", "investigating"])
      .gte("created_at", since)
      .limit(1);
    if (relatedStaffId) q = q.eq("related_staff_id", relatedStaffId);
    const { data } = await q.maybeSingle();
    return Boolean(data?.id);
  } catch {
    return false;
  }
}
