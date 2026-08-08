import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertSeverity } from "@/lib/dashboard-data";
import { sendTelegram } from "@/lib/notify";

/**
 * Alert creation with dedupe. The rule engine (Phase 2) and any future hook call
 * this; it never throws, because an alerting failure must not fail the sale that
 * triggered it.
 */

export type CreateAlertInput = {
  organizationId: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  relatedStaffId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  metadata?: Record<string, unknown>;
};

/** Same problem reported again inside this window updates the open row instead. */
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function createAlert(
  supabase: SupabaseClient,
  input: CreateAlertInput
): Promise<string | null> {
  try {
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();

    let query = supabase
      .from("alerts")
      .select("id, metadata")
      .eq("organization_id", input.organizationId)
      .eq("type", input.type)
      .in("status", ["open", "investigating"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);

    // Null staff id means an org-level alert; match those on type alone.
    query = input.relatedStaffId
      ? query.eq("related_staff_id", input.relatedStaffId)
      : query.is("related_staff_id", null);

    const { data: existing } = await query;
    const open = Array.isArray(existing) ? existing[0] : existing;

    if (open?.id) {
      const metadata = (open.metadata || {}) as Record<string, unknown>;
      await supabase
        .from("alerts")
        .update({
          message: input.message,
          severity: input.severity,
          metadata: {
            ...metadata,
            ...(input.metadata || {}),
            hits: (typeof metadata.hits === "number" ? metadata.hits : 1) + 1,
          },
        })
        .eq("id", open.id);
      return open.id as string;
    }

    const { data, error } = await supabase
      .from("alerts")
      .insert({
        organization_id: input.organizationId,
        type: input.type,
        severity: input.severity,
        title: input.title,
        message: input.message,
        related_staff_id: input.relatedStaffId ?? null,
        related_entity_type: input.relatedEntityType ?? null,
        related_entity_id: input.relatedEntityId ?? null,
        metadata: input.metadata ?? {},
      })
      .select("id")
      .single();

    if (error) return null;
    const alertId = (data?.id as string) ?? null;
    if (alertId) {
      await autoHandleSeverity(supabase, alertId, input);
    }
    return alertId;
  } catch {
    return null;
  }
}

/**
 * Severity policy, applied to fresh alerts only (dedupe updates skip it):
 * - low: the system handles it — a task is created for the floor leadership and
 *   the alert is flagged "auto handled" so the owner is not paged for trivia.
 * - high: the owner gets paged immediately on the enabled Telegram channel.
 * Every step is isolated in its own try/catch; none of this may fail an insert.
 */
async function autoHandleSeverity(
  supabase: SupabaseClient,
  alertId: string,
  input: CreateAlertInput
): Promise<void> {
  if (input.severity === "low") {
    try {
      // Prefer a supervisor/manager; fall back to the owner so the task
      // always lands on someone who can act on it.
      const { data: leaders } = await supabase
        .from("memberships")
        .select("user_id, role")
        .eq("organization_id", input.organizationId)
        .in("role", ["supervisor", "manager", "owner", "admin"])
        .order("created_at", { ascending: true })
        .limit(10);
      const pick = (roles: string[]) =>
        (leaders || []).find((row) => roles.includes(String(row.role)))?.user_id as
          | string
          | undefined;
      const assignee = pick(["supervisor", "manager"]) ?? pick(["owner", "admin"]) ?? null;

      await supabase.from("tasks").insert({
        organization_id: input.organizationId,
        title: input.title,
        notes: input.message,
        source: "alert",
        alert_id: alertId,
        assigned_to: assignee,
      });
      await supabase
        .from("alerts")
        .update({ metadata: { ...(input.metadata || {}), auto_handled: true } })
        .eq("id", alertId);
    } catch {
      // Auto-handling is a bonus, never a blocker.
    }
    return;
  }

  if (input.severity === "high") {
    try {
      const { data: channels } = await supabase
        .from("notification_channels")
        .select("target")
        .eq("organization_id", input.organizationId)
        .eq("kind", "telegram")
        .eq("enabled", true)
        .limit(1);
      const target = channels?.[0]?.target as string | undefined;
      if (target) {
        await sendTelegram(target, `[ALLVISOR] ${input.title}\n\n${input.message}`);
      }
    } catch {
      // Notification failures never reach the caller.
    }
  }
}
