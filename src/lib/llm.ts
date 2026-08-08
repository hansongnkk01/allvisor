/**
 * OpenAI-compatible LLM client over plain fetch — no SDK dependency.
 *
 * Works with any provider that exposes /chat/completions: Kimi/Moonshot,
 * OpenRouter, Groq, etc. Everything is optional: without env keys every call
 * returns null and the caller falls back to rule-based text, so the AI layer
 * can never take the app down.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const TIMEOUT_MS = 20_000;

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY);
}

export function llmModel(): string {
  return process.env.LLM_MODEL || "moonshot-v1-8k";
}

/**
 * One completion round-trip. Returns null on any failure (missing config,
 * network error, non-200, malformed body) so callers always have a fallback.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<{ text: string; model: string } | null> {
  const baseUrl = process.env.LLM_BASE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.LLM_API_KEY;
  if (!baseUrl || !apiKey) return null;

  const model = llmModel();
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 700,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // The briefing/chat endpoints are POSTed per request; never cache.
      cache: "no-store",
    });
    if (!response.ok) return null;

    const body = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const text = body.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) return null;
    return { text: text.trim(), model };
  } catch {
    return null;
  }
}
