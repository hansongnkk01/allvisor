import type { SupabaseClientLike } from "./types-internal";

export async function createTaskFromAlert(
  supabase: SupabaseClientLike,
  input: {
    organizationId: string;
    alertId: string;
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high";
    assignedTo?: string | null;
    createdBy?: string | null;
  }
): Promise<{ id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        organization_id: input.organizationId,
        title: input.title,
        description: input.description || null,
        status: "open",
        priority: input.priority || "medium",
        source: "rule",
        assigned_to: input.assignedTo || null,
        created_by: input.createdBy || null,
        related_alert_id: input.alertId,
        metadata: {},
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    return { id: data?.id as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "task create failed" };
  }
}
