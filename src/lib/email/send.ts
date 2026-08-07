/**
 * Minimal outbound email. Resend is called over plain fetch so the project does
 * not gain a dependency for four HTTP calls a day.
 *
 * With no RESEND_API_KEY the sender becomes a no-op that reports "skipped", so
 * local development and preview deploys never post real mail.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  /** Plain text only. HTML mail lands in the promotions tab and reads as an ad. */
  text: string;
  /** Shown in the inbox preview line after the subject. */
  preheader?: string;
  /** One-click unsubscribe target, required for anything bulk. */
  unsubscribeUrl?: string;
};

export type SendEmailResult =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; id: string | null }
  | { ok: false; error: string };

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function emailIsConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MARKETING_FROM_EMAIL);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MARKETING_FROM_EMAIL;
  if (!apiKey || !from) return { ok: true, skipped: true };

  // Gmail shows the preheader next to the subject. Without one it grabs the
  // first line of the body, which is the greeting, which tells the reader
  // nothing.
  const body = input.preheader ? `${input.preheader}\n\n${input.text}` : input.text;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const payload: Record<string, unknown> = {
    from,
    to: [input.to],
    subject: input.subject,
    text: body,
  };

  if (input.unsubscribeUrl) {
    payload.headers = {
      "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `${res.status} ${detail.slice(0, 300)}` };
    }

    const json = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, skipped: false, id: json?.id ?? null };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
