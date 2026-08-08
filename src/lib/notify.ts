import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Outbound notification channels. Telegram works end-to-end through the Bot
 * API (a single fetch). WhatsApp stays an honest placeholder: the number is
 * stored for display and the owner copies the briefing text from the
 * dashboard card until an official integration exists.
 *
 * Nothing here throws — a broken channel must never affect the app.
 */

const TELEGRAM_LIMIT = 4000;
const SEND_TIMEOUT_MS = 15_000;

/** target format: "botToken:chatId" (both parts may contain ":" — split once). */
export async function sendTelegram(
  target: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const separator = target.indexOf(":");
  if (separator <= 0 || separator === target.length - 1) {
    return { ok: false, error: "Invalid Telegram target (expected botToken:chatId)" };
  }
  const token = target.slice(0, separator).trim();
  const chatId = target.slice(separator + 1).trim();
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, TELEGRAM_LIMIT),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { description?: string } | null;
      return { ok: false, error: body?.description || `HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Sends text to every enabled channel of the org. Telegram is delivered;
 * WhatsApp rows are skipped on purpose (copy-from-dashboard flow).
 */
export async function sendToChannels(
  supabase: SupabaseClient,
  orgId: string,
  text: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  try {
    const { data: channels } = await supabase
      .from("notification_channels")
      .select("id, kind, target")
      .eq("organization_id", orgId)
      .eq("enabled", true);

    for (const channel of channels || []) {
      if (channel.kind !== "telegram") continue;
      const result = await sendTelegram(String(channel.target || ""), text);
      await supabase
        .from("notification_channels")
        .update(
          result.ok
            ? { last_sent_at: new Date().toISOString(), last_error: null }
            : { last_error: result.error || "send failed" }
        )
        .eq("id", channel.id);
      if (result.ok) sent += 1;
      else failed += 1;
    }
  } catch {
    // Channel bookkeeping must never break the caller.
  }
  return { sent, failed };
}
