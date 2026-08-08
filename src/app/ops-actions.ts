"use server";

/**
 * Ops Brain actions: alerts workflow, tasks, and the per-org feature flag.
 * Kept in their own file so the transactional actions stay untouched.
 */

import { getOrgContext } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { canAccessOwnerArea, canAccessSensitive, canManageOrgSettings } from "@/lib/roles";
import { revalidateApp, revalidateAppLayout } from "@/lib/revalidate";
import { logActivity } from "@/lib/activity";
import { generateBriefing, buildBriefingContext } from "@/lib/briefing";
import { answerOwnerQuestion } from "@/lib/ai-chat";
import { pickCycleCountSkus } from "@/lib/smart-inventory";
import { dayBoundsMY } from "@/lib/datetime-my";
import { adjustStockAction, isAdminZoneUnlocked } from "@/app/actions";
import type { AlertStatus } from "@/lib/dashboard-data";
import type { MembershipRole } from "@/lib/types";

async function requireMember() {
  const ctx = await getOrgContext();
  if (!ctx) throw new Error("No organization");
  const supabase = await createClient();
  return { ...ctx, supabase };
}

/**
 * Alert queue + tasks are Manager Zone work: leadership roles always may, and
 * any other role may once the zone password is unlocked on this device.
 */
async function canWorkZone(role: MembershipRole) {
  if (canAccessSensitive(role)) return true;
  return isAdminZoneUnlocked();
}

const ALERT_WRITE_STATUS: AlertStatus[] = ["investigating", "resolved"];

export async function setAlertStatusAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!(await canWorkZone(membership.role))) return { error: "Forbidden" };

  const alertId = String(formData.get("alert_id") || "");
  const status = String(formData.get("status") || "") as AlertStatus;
  if (!alertId || !ALERT_WRITE_STATUS.includes(status)) return { error: "Invalid request" };

  const { error } = await supabase
    .from("alerts")
    .update({
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
      resolved_by: status === "resolved" ? profile.id : null,
    })
    .eq("id", alertId)
    .eq("organization_id", organization.id);
  if (error) return { error: error.message };

  await logActivity({
    action: `alert.${status}`,
    summary: `${status === "resolved" ? "Resolved" : "Investigating"} alert`,
    entityType: "alert",
    entityId: alertId,
  });

  revalidateApp("/alerts", "/dashboard", "/admin-dashboard");
  return { success: true };
}

export async function addTaskAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!(await canWorkZone(membership.role))) return { error: "Forbidden" };

  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "Title required" };
  if (title.length > 140) return { error: "Title too long" };

  const notes = String(formData.get("notes") || "").trim() || null;
  const assignedTo = String(formData.get("assigned_to") || "").trim() || null;
  const dueDate = String(formData.get("due_date") || "").trim() || null;

  // The assignee must be a member of this org — never trust a client-sent id.
  if (assignedTo) {
    const { data: assigneeMember } = await supabase
      .from("memberships")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("user_id", assignedTo)
      .maybeSingle();
    if (!assigneeMember) return { error: "Assignee is not in your team" };
  }

  const { error } = await supabase.from("tasks").insert({
    organization_id: organization.id,
    title,
    notes,
    assigned_to: assignedTo,
    due_date: dueDate,
    source: "manual",
    created_by: profile.id,
  });
  if (error) return { error: error.message };

  await logActivity({
    action: "task.created",
    summary: `Assigned task: ${title}`,
    entityType: "task",
  });

  revalidateApp("/alerts", "/dashboard", "/admin-dashboard");
  return { success: true };
}

export async function toggleTaskAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();

  const taskId = String(formData.get("task_id") || "");
  if (!taskId) return { error: "Invalid request" };

  const { data: task } = await supabase
    .from("tasks")
    .select("id, status, assigned_to")
    .eq("id", taskId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!task) return { error: "Task not found" };

  const isAssignee = task.assigned_to === profile.id;
  if (!isAssignee && !(await canWorkZone(membership.role))) return { error: "Forbidden" };

  const done = task.status !== "done";
  const { error } = await supabase
    .from("tasks")
    .update({
      status: done ? "done" : "open",
      done_at: done ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .eq("organization_id", organization.id);
  if (error) return { error: error.message };

  revalidateApp("/alerts", "/dashboard", "/admin-dashboard");
  return { success: true };
}

/** Detection thresholds for the loss-prevention rules (leadership-editable). */
export async function updateAlertSettingsAction(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (!(await canWorkZone(membership.role))) return { error: "Forbidden" };

  const num = (key: string, fallback: number, min: number, max: number) => {
    const parsed = Number(formData.get(key));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  };

  const settings = {
    refund_rate_percent: num("refund_rate_percent", 8, 1, 100),
    cash_variance_rm: num("cash_variance_rm", 20, 1, 100000),
    stock_leak_rm: num("stock_leak_rm", 100, 1, 1000000),
  };

  const { error } = await supabase
    .from("organizations")
    .update({ alert_settings: settings })
    .eq("id", organization.id);
  if (error) return { error: error.message };

  await logActivity({
    action: "alert_settings.updated",
    summary: `Updated detection rules: refund ${settings.refund_rate_percent}%, cash RM${settings.cash_variance_rm}, stock RM${settings.stock_leak_rm}`,
    entityType: "organization",
    entityId: organization.id,
  });

  revalidateApp("/admin", "/alerts");
  return { success: true };
}

/** Owner/admin-only kill switch for the whole Ops Brain surface. */
export async function setOpsBrainEnabledAction(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (!canManageOrgSettings(membership.role)) return { error: "Forbidden" };

  const enabled = String(formData.get("enabled") || "") === "true";
  const { error } = await supabase
    .from("organizations")
    .update({ ops_brain_enabled: enabled })
    .eq("id", organization.id);
  if (error) return { error: error.message };

  await logActivity({
    action: "ops_brain.toggled",
    summary: `${enabled ? "Enabled" : "Disabled"} the AI supervisor`,
    entityType: "organization",
    entityId: organization.id,
  });

  revalidateAppLayout();
  revalidateApp("/dashboard", "/admin-dashboard", "/alerts");
  return { success: true };
}

// ── Fasa 4: cycle count ─────────────────────────────────────────────────────

const CYCLE_COUNT_SKUS = 10;

/**
 * "Cycle count hari ini": value-weighted random pick of SKUs, written as
 * pending rows. SKUs already pending today are skipped so the list never
 * duplicates mid-count.
 */
export async function startCycleCountAction() {
  const { supabase, organization } = await requireMember();

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, quantity, unit_price, track_stock")
    .eq("organization_id", organization.id)
    .limit(1000);
  if (productsError) return { error: productsError.message };

  const { start: todayStart } = dayBoundsMY(new Date());
  const { data: pendingToday } = await supabase
    .from("stock_counts")
    .select("product_id")
    .eq("organization_id", organization.id)
    .eq("status", "pending")
    .gte("created_at", todayStart.toISOString());
  const already = new Set((pendingToday || []).map((row) => String(row.product_id)));

  const candidates = (products || []).filter(
    (product) => product.track_stock !== false && !already.has(String(product.id))
  );
  const picked = pickCycleCountSkus(
    candidates.map((product) => ({
      id: String(product.id),
      quantity: Number(product.quantity || 0),
      unit_price: Number(product.unit_price || 0),
    })),
    CYCLE_COUNT_SKUS
  );
  if (!picked.length) return { error: "No countable stock today" };

  const { error } = await supabase.from("stock_counts").insert(
    picked.map((product) => ({
      organization_id: organization.id,
      product_id: product.id,
      expected_qty: product.quantity,
    }))
  );
  if (error) return { error: error.message };

  await logActivity({
    action: "inventory.cycle_count_started",
    summary: `Started a cycle count for ${picked.length} SKUs`,
    entityType: "stock_count",
  });

  revalidateApp("/inventory");
  return { success: true };
}

/**
 * Submit one counted row. A difference goes through the existing, tested
 * adjustStockAction so the adjustment is logged exactly like a manual one.
 */
export async function submitCycleCountAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();

  const countId = String(formData.get("count_id") || "");
  const countedRaw = Number(formData.get("counted_qty"));
  if (!countId || !Number.isFinite(countedRaw) || countedRaw < 0) {
    return { error: "Invalid count" };
  }

  const { data: row } = await supabase
    .from("stock_counts")
    .select("id, product_id, expected_qty, status")
    .eq("id", countId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!row || row.status !== "pending") return { error: "Count not found" };

  const expected = Number(row.expected_qty);
  const diff = Math.round((countedRaw - expected) * 1000) / 1000;

  // Adjust first: if the stock move fails, the count stays pending and nothing
  // is half-recorded.
  if (diff !== 0) {
    const adjustData = new FormData();
    adjustData.set("product_id", String(row.product_id));
    adjustData.set("type", diff > 0 ? "in" : "adjust");
    adjustData.set("quantity", String(Math.abs(diff)));
    adjustData.set("note", "Cycle count");
    const adjusted = await adjustStockAction(adjustData);
    if (adjusted && "error" in adjusted && adjusted.error) {
      return { error: adjusted.error };
    }
  }

  const { error } = await supabase
    .from("stock_counts")
    .update({
      counted_qty: countedRaw,
      status: "submitted",
      counted_by: profile.id,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", countId)
    .eq("organization_id", organization.id);
  if (error) return { error: error.message };

  await logActivity({
    action: "inventory.cycle_count_submitted",
    summary: `Cycle count submitted (expected ${expected}, counted ${countedRaw})`,
    entityType: "stock_count",
    entityId: countId,
  });

  revalidateApp("/inventory");
  return { success: true };
}

// ── Fasa 5: lapisan AI ───────────────────────────────────────────────────────

/** "Jana semula" on the briefing card. Owner/admin; writes through RLS. */
export async function regenerateBriefingAction() {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canAccessOwnerArea(membership.role)) return { error: "Forbidden" };

  const locale = String(organization.locale_default || "ms");
  const result = await generateBriefing({
    supabase,
    orgId: organization.id,
    locale,
    now: new Date(),
    generatedBy: profile.id,
  });
  if (!result) return { error: "Briefing unavailable (Ops Brain off or migration pending)" };

  await logActivity({
    action: "briefing.regenerated",
    summary: `Regenerated the AI briefing (${result.model})`,
    entityType: "ai_briefing",
  });

  revalidateApp("/dashboard", "/admin-dashboard");
  return { success: true };
}

const CHANNEL_KINDS = ["telegram", "whatsapp"] as const;

/** Save (upsert) a notification channel target. Owner/admin only by RLS. */
export async function saveNotificationChannelAction(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (!canManageOrgSettings(membership.role)) return { error: "Forbidden" };

  const kind = String(formData.get("kind") || "");
  if (!CHANNEL_KINDS.includes(kind as (typeof CHANNEL_KINDS)[number])) {
    return { error: "Invalid channel" };
  }
  const target = String(formData.get("target") || "").trim();
  if (!target || target.length > 200) return { error: "Target required" };
  if (kind === "telegram" && !target.includes(":")) {
    return { error: "Telegram target must be botToken:chatId" };
  }

  const { error } = await supabase.from("notification_channels").upsert(
    {
      organization_id: organization.id,
      kind,
      target,
      enabled: true,
      last_error: null,
    },
    { onConflict: "organization_id,kind" }
  );
  if (error) return { error: error.message };

  await logActivity({
    action: "notification_channel.saved",
    summary: `Saved ${kind} notification channel`,
    entityType: "notification_channel",
  });

  revalidateApp("/admin");
  return { success: true };
}

export async function setNotificationChannelEnabledAction(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (!canManageOrgSettings(membership.role)) return { error: "Forbidden" };

  const kind = String(formData.get("kind") || "");
  if (!CHANNEL_KINDS.includes(kind as (typeof CHANNEL_KINDS)[number])) {
    return { error: "Invalid channel" };
  }
  const enabled = String(formData.get("enabled") || "") === "true";

  const { error } = await supabase
    .from("notification_channels")
    .update({ enabled })
    .eq("organization_id", organization.id)
    .eq("kind", kind);
  if (error) return { error: error.message };

  revalidateApp("/admin");
  return { success: true };
}

/**
 * Owner chat. Persists both turns so the conversation survives reloads, and
 * answers from a live data snapshot — LLM when configured, rules otherwise.
 */
export async function askAiSupervisorAction(input: {
  sessionId?: string | null;
  message: string;
}): Promise<
  | { sessionId: string; answer: string; model: string }
  | { error: string }
> {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canAccessOwnerArea(membership.role)) return { error: "Forbidden" };

  const message = String(input.message || "").trim();
  if (!message) return { error: "Empty message" };
  if (message.length > 500) return { error: "Message too long" };

  // Ops Brain off means no chat either — same flag governs the whole surface.
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("ops_brain_enabled, locale_default, name")
    .eq("id", organization.id)
    .maybeSingle();
  if (orgRow?.ops_brain_enabled === false) return { error: "AI supervisor is disabled" };

  try {
    let sessionId = input.sessionId || null;
    if (sessionId) {
      const { data: session } = await supabase
        .from("ai_chat_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("organization_id", organization.id)
        .eq("user_id", profile.id)
        .maybeSingle();
      if (!session) sessionId = null;
    }
    if (!sessionId) {
      const { data: created, error: sessionError } = await supabase
        .from("ai_chat_sessions")
        .insert({
          organization_id: organization.id,
          user_id: profile.id,
          title: message.slice(0, 60),
        })
        .select("id")
        .single();
      if (sessionError || !created) return { error: sessionError?.message || "Session failed" };
      sessionId = created.id as string;
    }

    const { error: userError } = await supabase.from("ai_chat_messages").insert({
      session_id: sessionId,
      organization_id: organization.id,
      role: "user",
      content: message,
    });
    if (userError) return { error: userError.message };

    const { data: historyRows } = await supabase
      .from("ai_chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(9);
    const history = (historyRows || [])
      .reverse()
      .slice(0, -1) // the question we just inserted is passed separately
      .map((row) => ({
        role: row.role as "user" | "assistant",
        content: String(row.content),
      }));

    const ms = String(orgRow?.locale_default || organization.locale_default || "ms").startsWith("ms");
    const context = await buildBriefingContext(
      supabase,
      organization.id,
      String(orgRow?.name || organization.name || ""),
      new Date()
    );
    const answer = await answerOwnerQuestion({ question: message, history, context, ms });

    await supabase.from("ai_chat_messages").insert({
      session_id: sessionId,
      organization_id: organization.id,
      role: "assistant",
      content: answer.text,
      model: answer.model,
    });

    return { sessionId, answer: answer.text, model: answer.model };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/** Loads the latest chat session for the floating widget (owner/admin). */
export async function loadAiChatSessionAction(): Promise<
  | { sessionId: string; messages: { role: string; content: string; model: string }[] }
  | { sessionId: null; messages: [] }
> {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canAccessOwnerArea(membership.role)) return { sessionId: null, messages: [] };

  try {
    const { data: session } = await supabase
      .from("ai_chat_sessions")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return { sessionId: null, messages: [] };

    const { data: messages } = await supabase
      .from("ai_chat_messages")
      .select("role, content, model")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .limit(50);

    return {
      sessionId: session.id as string,
      messages: (messages || []).map((row) => ({
        role: String(row.role),
        content: String(row.content),
        model: String(row.model || "rules"),
      })),
    };
  } catch {
    return { sessionId: null, messages: [] };
  }
}
