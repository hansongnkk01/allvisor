"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { revalidateApp } from "@/lib/revalidate";
import { logActivity } from "@/lib/activity";
import { canAccessAdmin, canAccessSensitive } from "@/lib/roles";
import { isOpsBrainEnabled } from "@/lib/ops-brain/enabled";
import { recomputeStaffScoresForDate } from "@/lib/ops-brain/scores";
import { pickCycleCountSkus, runSmartInventoryScan } from "@/lib/ops-brain/inventory";
import { createTaskFromAlert } from "@/lib/ops-brain/tasks";
import { buildRuleBasedBriefing, callLlmChat } from "@/lib/ops-brain/llm";
import { sendOpsBrainNotification } from "@/lib/ops-brain/notify";
import { formatDayKeyMY } from "@/lib/datetime-my";
import type { AlertStatus } from "@/lib/types";

async function requireMember() {
  const ctx = await getOrgContext();
  if (!ctx) throw new Error("No organization");
  const supabase = await createClient();
  return { ...ctx, supabase };
}

export async function setOpsBrainEnabledAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canAccessSensitive(membership.role)) return { error: "Forbidden" };

  const enabled = formData.get("ops_brain_enabled") === "1" || formData.get("ops_brain_enabled") === "on";
  const { error } = await supabase
    .from("organizations")
    .update({ ops_brain_enabled: enabled })
    .eq("id", organization.id);

  if (error) {
    if (/ops_brain_enabled|schema cache|could not find/i.test(error.message)) {
      return { error: "Ops Brain migration not applied yet. Run 025_ops_brain_foundation.sql." };
    }
    return { error: error.message };
  }

  await logActivity({
    action: "ops_brain.toggle",
    summary: enabled ? "Enabled Ops Brain" : "Disabled Ops Brain",
    entityType: "organization",
    entityId: organization.id,
    meta: { by: profile.id },
  });

  revalidateApp("/admin", "/admin-dashboard", "/staff-dashboard", "/dashboard", "/alerts");
  return { success: true };
}

export async function updateAlertStatusAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();
  const id = String(formData.get("alert_id") || "");
  const status = String(formData.get("status") || "") as AlertStatus;
  if (!id || !["open", "investigating", "resolved", "auto_handled"].includes(status)) {
    return { error: "Invalid alert status" };
  }

  // Staff may only resolve/investigate non-high alerts they can see
  if (!canAccessAdmin(membership.role)) {
    const { data: alert } = await supabase
      .from("alerts")
      .select("severity")
      .eq("id", id)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (alert?.severity === "high") return { error: "High severity alerts are admin-only" };
  }

  const patch: Record<string, unknown> = { status };
  if (status === "resolved" || status === "auto_handled") {
    patch.resolved_at = new Date().toISOString();
    patch.resolved_by = profile.id;
  }

  const { error } = await supabase
    .from("alerts")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) return { error: error.message };

  await logActivity({
    action: "ops_brain.alert_status",
    summary: `Alert marked ${status}`,
    entityType: "alert",
    entityId: id,
  });

  revalidateApp("/admin-dashboard", "/staff-dashboard", "/dashboard", "/alerts");
  return { success: true };
}

export async function createManualAlertAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canAccessSensitive(membership.role)) return { error: "Forbidden" };
  if (!isOpsBrainEnabled(organization)) return { error: "Ops Brain is disabled" };

  const title = String(formData.get("title") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const severity = String(formData.get("severity") || "medium");
  if (!title || !message) return { error: "Title and message required" };

  const { data, error } = await supabase
    .from("alerts")
    .insert({
      organization_id: organization.id,
      type: "manual",
      severity: ["low", "medium", "high"].includes(severity) ? severity : "medium",
      title,
      message,
      status: "open",
      related_staff_id: null,
      metadata: { created_by: profile.id },
      escalated_at: severity === "high" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidateApp("/admin-dashboard", "/alerts");
  return { success: true, id: data.id };
}

export async function recomputeStaffScoresAction() {
  const { supabase, organization, membership } = await requireMember();
  if (!canAccessAdmin(membership.role)) return { error: "Forbidden" };
  if (!isOpsBrainEnabled(organization)) return { error: "Ops Brain is disabled" };

  const scoreDate = formatDayKeyMY(new Date());
  const result = await recomputeStaffScoresForDate(supabase, organization.id, scoreDate);
  if (result.error) return { error: result.error };
  revalidateApp("/admin-dashboard", "/staff-dashboard");
  return { success: true, count: result.count };
}

export async function runSmartInventoryScanAction() {
  const { supabase, organization, membership } = await requireMember();
  if (!canAccessSensitive(membership.role)) return { error: "Forbidden" };
  if (!isOpsBrainEnabled(organization)) return { error: "Ops Brain is disabled" };

  const result = await runSmartInventoryScan(supabase, organization);
  if (result.error) return { error: result.error };
  revalidateApp("/admin-dashboard", "/alerts", "/inventory");
  return { success: true, created: result.created };
}

export async function getCycleCountSkusAction() {
  const { supabase, organization, membership } = await requireMember();
  if (!isOpsBrainEnabled(organization)) return { error: "Ops Brain is disabled", skus: [] };
  if (!canAccessSensitive(membership.role) && membership.role !== "staff") {
    return { error: "Forbidden", skus: [] };
  }
  const skus = await pickCycleCountSkus(supabase, organization.id, 8);
  return { success: true, skus };
}

export async function submitCycleCountAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();
  if (!isOpsBrainEnabled(organization)) return { error: "Ops Brain is disabled" };

  const productId = String(formData.get("product_id") || "");
  const counted = Number(formData.get("counted_qty") || NaN);
  if (!productId || Number.isNaN(counted) || counted < 0) return { error: "Invalid count" };

  const { data: product } = await supabase
    .from("products")
    .select("id, name, quantity, unit_price")
    .eq("id", productId)
    .eq("organization_id", organization.id)
    .single();
  if (!product) return { error: "Product not found" };

  const current = Number(product.quantity || 0);
  const delta = counted - current;
  if (delta === 0) return { success: true, unchanged: true };

  const adjNumber = `CC-${Date.now().toString().slice(-8)}`;
  const { data: adj, error: adjErr } = await supabase
    .from("stock_adjustments")
    .insert({
      organization_id: organization.id,
      adjustment_number: adjNumber,
      reason: "cycle_count",
      notes: `Cycle count by ${profile.full_name || profile.email}`,
      created_by: profile.id,
      created_by_name: profile.full_name || profile.email || "Staff",
    })
    .select("id")
    .single();

  if (adjErr) {
    // Fallback: direct stock update + movement if adjustments table shape differs
    await supabase
      .from("products")
      .update({ quantity: counted })
      .eq("id", productId)
      .eq("organization_id", organization.id);
    await supabase.from("stock_movements").insert({
      organization_id: organization.id,
      product_id: productId,
      quantity: Math.abs(delta),
      type: "adjust",
      note: "cycle_count",
      created_by: profile.id,
    });
  } else {
    await supabase.from("stock_adjustment_lines").insert({
      adjustment_id: adj.id,
      product_id: productId,
      quantity_before: current,
      quantity_after: counted,
      delta,
    });
    await supabase
      .from("products")
      .update({ quantity: counted })
      .eq("id", productId)
      .eq("organization_id", organization.id);
    await supabase.from("stock_movements").insert({
      organization_id: organization.id,
      product_id: productId,
      quantity: Math.abs(delta),
      type: "adjust",
      note: `cycle_count:${adj.id}`,
      created_by: profile.id,
    });
  }

  await logActivity({
    action: "ops_brain.cycle_count",
    summary: `Cycle count ${product.name}: ${current} → ${counted}`,
    entityType: "product",
    entityId: productId,
    meta: { delta },
  });

  revalidateApp("/inventory", "/admin-dashboard", "/staff-dashboard");
  return { success: true, delta };
}

export async function createTaskAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canAccessSensitive(membership.role)) return { error: "Forbidden" };

  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "Title required" };
  const assignedTo = String(formData.get("assigned_to") || "").trim() || null;
  const priority = String(formData.get("priority") || "medium");
  const description = String(formData.get("description") || "").trim() || null;
  const alertId = String(formData.get("related_alert_id") || "").trim() || null;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: organization.id,
      title,
      description,
      status: "open",
      priority: ["low", "medium", "high"].includes(priority) ? priority : "medium",
      source: "manual",
      assigned_to: assignedTo,
      created_by: profile.id,
      related_alert_id: alertId,
      metadata: {},
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (alertId) {
    await supabase
      .from("alerts")
      .update({
        status: "auto_handled",
        auto_handled_at: new Date().toISOString(),
      })
      .eq("id", alertId)
      .eq("organization_id", organization.id)
      .eq("severity", "low");
  }

  revalidateApp("/admin-dashboard", "/staff-dashboard", "/tasks");
  return { success: true, id: data.id };
}

export async function updateTaskStatusAction(formData: FormData) {
  const { supabase, organization, profile, membership } = await requireMember();
  const id = String(formData.get("task_id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !["open", "in_progress", "done", "cancelled"].includes(status)) {
    return { error: "Invalid task" };
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("assigned_to")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!task) return { error: "Not found" };

  if (
    !canAccessAdmin(membership.role) &&
    task.assigned_to &&
    task.assigned_to !== profile.id
  ) {
    return { error: "Not your task" };
  }

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "done") patch.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) return { error: error.message };
  revalidateApp("/admin-dashboard", "/staff-dashboard", "/tasks");
  return { success: true };
}

/** Auto-create task from low alert (safe handle). */
export async function autoHandleLowAlertAction(formDataOrId: FormData | string) {
  const { supabase, organization, profile } = await requireMember();
  if (!isOpsBrainEnabled(organization)) return { error: "Ops Brain is disabled" };

  const alertId =
    typeof formDataOrId === "string"
      ? formDataOrId
      : String(formDataOrId.get("alert_id") || "");
  if (!alertId) return { error: "Alert required" };

  const { data: alert } = await supabase
    .from("alerts")
    .select("*")
    .eq("id", alertId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!alert) return { error: "Alert not found" };
  if (alert.severity !== "low") return { error: "Only low severity can auto-handle" };

  const task = await createTaskFromAlert(supabase, {
    organizationId: organization.id,
    alertId: alert.id,
    title: `Follow up: ${alert.title}`,
    description: alert.message,
    priority: "low",
    createdBy: profile.id,
  });
  if (task.error) return { error: task.error };

  await supabase
    .from("alerts")
    .update({
      status: "auto_handled",
      auto_handled_at: new Date().toISOString(),
      resolved_by: profile.id,
    })
    .eq("id", alert.id);

  revalidateApp("/admin-dashboard", "/tasks", "/alerts");
  return { success: true, taskId: task.id };
}

export async function upsertNotificationChannelAction(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (!canAccessAdmin(membership.role)) return { error: "Forbidden" };

  const channelType = String(formData.get("channel_type") || "webhook");
  if (!["whatsapp", "telegram", "webhook"].includes(channelType)) {
    return { error: "Invalid channel" };
  }

  const { error } = await supabase.from("notification_channels").upsert(
    {
      organization_id: organization.id,
      channel_type: channelType,
      label: String(formData.get("label") || "").trim() || null,
      endpoint_url: String(formData.get("endpoint_url") || "").trim() || null,
      enabled: formData.get("enabled") === "1" || formData.get("enabled") === "on",
      notify_morning: formData.get("notify_morning") !== "0",
      notify_evening: formData.get("notify_evening") !== "0",
      notify_high_severity: formData.get("notify_high_severity") !== "0",
      config: {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,channel_type" }
  );

  if (error) return { error: error.message };
  revalidateApp("/admin", "/admin-dashboard");
  return { success: true };
}

export async function testNotifyWebhookAction() {
  const { supabase, organization, membership } = await requireMember();
  if (!canAccessAdmin(membership.role)) return { error: "Forbidden" };
  const result = await sendOpsBrainNotification(supabase, organization.id, {
    title: "Allvisor Ops Brain test",
    body: "Webhook test from Allvisor",
    severity: "medium",
  });
  return { success: true, ...result };
}

export async function generateAiBriefingAction(formData?: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (!canAccessAdmin(membership.role)) return { error: "Forbidden" };
  if (!isOpsBrainEnabled(organization)) return { error: "Ops Brain is disabled" };

  const locale = (String(formData?.get("locale") || organization.locale_default || "ms") ===
  "en"
    ? "en"
    : "ms") as "ms" | "en";
  const periodKey = formatDayKeyMY(new Date());

  const [
    { data: alerts },
    { count: unpaid },
    { data: stock },
    { data: payments },
  ] = await Promise.all([
    supabase
      .from("alerts")
      .select("title, severity, status")
      .eq("organization_id", organization.id)
      .in("status", ["open", "investigating"])
      .limit(20),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .in("status", ["unpaid", "partial"]),
    supabase
      .from("products")
      .select("quantity, low_stock_threshold")
      .eq("organization_id", organization.id)
      .limit(300),
    supabase
      .from("payments")
      .select("amount, paid_at")
      .eq("organization_id", organization.id)
      .gte("paid_at", `${periodKey}T00:00:00+08:00`)
      .lte("paid_at", `${periodKey}T23:59:59.999+08:00`),
  ]);

  const openAlerts = alerts?.length || 0;
  const highAlerts = (alerts || []).filter((a) => a.severity === "high").length;
  const lowStock = (stock || []).filter(
    (p) => Number(p.quantity) <= Number(p.low_stock_threshold)
  ).length;
  const salesToday = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const topIssues = (alerts || []).slice(0, 5).map((a) => String(a.title));

  const snapshot = {
    openAlerts,
    highAlerts,
    unpaid: unpaid || 0,
    lowStock,
    salesToday,
    topIssues,
  };

  const ruleText = buildRuleBasedBriefing({ locale, ...snapshot });
  let content = ruleText;
  let source: "rule" | "llm" = "rule";
  let model: string | null = null;

  const llm = await callLlmChat(
    [
      {
        role: "system",
        content:
          locale === "ms"
            ? "Anda pembantu operasi perniagaan Malaysia. Ringkaskan data JSON kepada 3-5 ayat Bahasa Malaysia. Jangan cipta fakta di luar data."
            : "You are a Malaysian business ops assistant. Summarize the JSON into 3-5 English sentences. Do not invent facts.",
      },
      { role: "user", content: JSON.stringify(snapshot) },
    ],
    { timeoutMs: 10000 }
  );

  if (llm?.content) {
    content = llm.content;
    source = "llm";
    model = llm.model;
  }

  const { error } = await supabase.from("ai_briefings").upsert(
    {
      organization_id: organization.id,
      period_type: "daily",
      period_key: periodKey,
      locale,
      content,
      source,
      model,
      input_snapshot: snapshot,
    },
    { onConflict: "organization_id,period_type,period_key,locale" }
  );

  if (error) return { error: error.message, content, source };
  revalidateApp("/admin-dashboard");
  return { success: true, content, source };
}

export async function sendOwnerChatAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canAccessAdmin(membership.role)) return { error: "Forbidden" };
  if (!isOpsBrainEnabled(organization)) return { error: "Ops Brain is disabled" };

  const message = String(formData.get("message") || "").trim();
  if (!message) return { error: "Message required" };
  const locale = (String(formData.get("locale") || "ms") === "en" ? "en" : "ms") as
    | "ms"
    | "en";

  let sessionId = String(formData.get("session_id") || "").trim();
  if (!sessionId) {
    const { data: session, error: sErr } = await supabase
      .from("ai_chat_sessions")
      .insert({
        organization_id: organization.id,
        created_by: profile.id,
        title: message.slice(0, 80),
        locale,
      })
      .select("id")
      .single();
    if (sErr) return { error: sErr.message };
    sessionId = session.id;
  }

  const { data: openAlerts } = await supabase
    .from("alerts")
    .select("title, severity, message, status, created_at")
    .eq("organization_id", organization.id)
    .in("status", ["open", "investigating", "auto_handled"])
    .order("created_at", { ascending: false })
    .limit(15);

  const { data: scores } = await supabase
    .from("staff_scores")
    .select("user_id, score, refund_rate, sales_amount, score_date")
    .eq("organization_id", organization.id)
    .eq("score_date", formatDayKeyMY(new Date()))
    .order("score", { ascending: false })
    .limit(10);

  const context = { alerts: openAlerts || [], scores: scores || [] };

  await supabase.from("ai_chat_messages").insert({
    organization_id: organization.id,
    session_id: sessionId,
    role: "user",
    content: message,
    context_snapshot: {},
  });

  const llm = await callLlmChat(
    [
      {
        role: "system",
        content:
          locale === "ms"
            ? "Jawab soalan owner berdasarkan JSON data sahaja. Jika tiada data, katakan tiada rekod. Jangan cipta angka."
            : "Answer the owner using only the provided JSON. If missing, say no record. Do not invent numbers.",
      },
      {
        role: "user",
        content: `DATA:\n${JSON.stringify(context)}\n\nQUESTION:\n${message}`,
      },
    ],
    { timeoutMs: 12000 }
  );

  const reply =
    llm?.content ||
    (locale === "ms"
      ? `Berdasarkan data semasa: ${openAlerts?.length || 0} amaran terbuka. (AI luar talian — jawapan rule-based.)`
      : `Based on current data: ${openAlerts?.length || 0} open alerts. (AI offline — rule-based reply.)`);

  await supabase.from("ai_chat_messages").insert({
    organization_id: organization.id,
    session_id: sessionId,
    role: "assistant",
    content: reply,
    context_snapshot: context,
    model: llm?.model || null,
  });

  await supabase
    .from("ai_chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  revalidateApp("/admin-dashboard", "/ai-chat");
  return { success: true, sessionId, reply, source: llm ? "llm" : "rule" };
}
