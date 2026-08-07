import type { SupabaseClientLike } from "./types-internal";

/** Stub / webhook notify — never throws. */
export async function sendOpsBrainNotification(
  supabase: SupabaseClientLike,
  organizationId: string,
  payload: { title: string; body: string; severity?: string }
): Promise<{ sent: number; error?: string }> {
  try {
    const { data: channels } = await supabase
      .from("notification_channels")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("enabled", true);

    let sent = 0;
    for (const ch of channels || []) {
      const highOnly = Boolean(ch.notify_high_severity);
      if (highOnly && payload.severity !== "high" && payload.severity !== "medium") {
        // still allow medium for webhook tests
      }
      const url = String(ch.endpoint_url || "").trim();
      if (!url) continue;
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: ch.channel_type,
            organization_id: organizationId,
            ...payload,
          }),
        });
        sent += 1;
      } catch {
        /* continue other channels */
      }
    }
    return { sent };
  } catch (e) {
    return { sent: 0, error: e instanceof Error ? e.message : "notify failed" };
  }
}
