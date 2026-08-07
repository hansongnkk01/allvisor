type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const DEFAULT_TIMEOUT_MS = 10000;

export function buildRuleBasedBriefing(input: {
  locale: "ms" | "en";
  openAlerts: number;
  highAlerts: number;
  unpaid: number;
  lowStock: number;
  salesToday: number;
  topIssues: string[];
}): string {
  if (input.locale === "ms") {
    const issues =
      input.topIssues.length > 0
        ? input.topIssues.slice(0, 3).join("; ")
        : "tiada isu kritikal";
    return `Ringkasan hari ini: jualan RM ${input.salesToday.toFixed(2)}. Amaran terbuka: ${input.openAlerts} (tinggi: ${input.highAlerts}). Invois belum bayar: ${input.unpaid}. Stok rendah: ${input.lowStock}. Isu utama: ${issues}.`;
  }
  const issues =
    input.topIssues.length > 0
      ? input.topIssues.slice(0, 3).join("; ")
      : "no critical issues";
  return `Today's briefing: sales RM ${input.salesToday.toFixed(2)}. Open alerts: ${input.openAlerts} (high: ${input.highAlerts}). Unpaid invoices: ${input.unpaid}. Low stock: ${input.lowStock}. Top issues: ${issues}.`;
}

/** OpenAI-compatible chat (Kimi / Moonshot). Returns null on failure. */
export async function callLlmChat(
  messages: ChatMessage[],
  opts?: { timeoutMs?: number; model?: string }
): Promise<{ content: string; model: string } | null> {
  const apiKey = process.env.KIMI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (
    process.env.KIMI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://api.moonshot.cn/v1"
  ).replace(/\/$/, "");
  const model =
    opts?.model ||
    process.env.KIMI_MODEL ||
    process.env.OPENAI_MODEL ||
    "moonshot-v1-8k";
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 600,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return { content, model };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
