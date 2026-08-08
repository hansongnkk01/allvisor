import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { emailIsConfigured, sendEmail } from "@/lib/email/send";
import {
  SEQUENCE_LENGTH,
  SEQUENCE_OFFSET_DAYS,
  buildSequenceEmail,
  nextDueStep,
  type SequenceLocale,
} from "@/lib/marketing-sequence";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Nobody is owed an email after this, so the query stays small forever. */
const WINDOW_DAYS = SEQUENCE_OFFSET_DAYS[SEQUENCE_LENGTH - 1] + 10;
const BATCH_LIMIT = 200;

type LeadRow = {
  id: string;
  full_name: string;
  email: string;
  locale: string | null;
  created_at: string;
  unsubscribe_token: string;
};

/**
 * Drip the /start follow-up sequence. Runs daily; each lead receives at most one
 * email per run, and the (lead_id, step) unique index makes a re-run harmless.
 *
 * Add ?dry=1 to see exactly who would be emailed without sending anything.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
  }

  if (!dryRun && !emailIsConfigured()) {
    // Claiming steps with no sender would silently burn the whole sequence.
    return NextResponse.json({
      ok: true,
      skipped: "RESEND_API_KEY or MARKETING_FROM_EMAIL is not set",
      sent: 0,
    });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, serviceKey);

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * 86400000).toISOString();

  const { data: leads, error } = await admin
    .from("marketing_leads")
    .select("id, full_name, email, locale, created_at, unsubscribe_token")
    .is("unsubscribed_at", null)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (leads || []) as LeadRow[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, candidates: 0, sent: 0 });
  }

  const { data: history } = await admin
    .from("marketing_emails")
    .select("lead_id, step")
    .in(
      "lead_id",
      rows.map((r) => r.id),
    );

  const sentByLead = new Map<string, number[]>();
  for (const row of (history || []) as { lead_id: string; step: number }[]) {
    const list = sentByLead.get(row.lead_id) || [];
    list.push(row.step);
    sentByLead.set(row.lead_id, list);
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://allvisor-five.vercel.app").replace(
    /\/$/,
    "",
  );

  let sent = 0;
  // Mask emails in the response: cron output lands in deploy logs, and lead
  // PII does not belong there. Lead ids are enough to trace a failure.
  const mask = (email: string) => email.replace(/^(.{1,2}).*(@.*)$/, "$1***$2");
  const planned: { email: string; step: number; subject: string }[] = [];
  const failures: string[] = [];

  for (const lead of rows) {
    const step = nextDueStep(new Date(lead.created_at), sentByLead.get(lead.id) || [], now);
    if (step === null) continue;

    const locale: SequenceLocale = lead.locale?.startsWith("en") ? "en" : "ms";
    const message = buildSequenceEmail(step, locale, {
      name: lead.full_name,
      playbookUrl: `${appUrl}/${locale}/start/playbook`,
      trialUrl: `${appUrl}/${locale}/register`,
      unsubscribeUrl: `${appUrl}/api/unsubscribe?token=${lead.unsubscribe_token}`,
    });
    if (!message) continue;

    if (dryRun) {
      planned.push({ email: mask(lead.email), step, subject: message.subject });
      continue;
    }

    // Claim the step before sending. If two runs overlap, the second insert
    // conflicts and that lead is skipped rather than emailed twice.
    const { error: claimError } = await admin
      .from("marketing_emails")
      .insert({ lead_id: lead.id, step, status: "sending" });
    if (claimError) continue;

    const result = await sendEmail({
      to: lead.email,
      subject: message.subject,
      preheader: message.preheader,
      text: message.body,
      unsubscribeUrl: `${appUrl}/api/unsubscribe?token=${lead.unsubscribe_token}`,
    });

    if (result.ok && !result.skipped) {
      await admin
        .from("marketing_emails")
        .update({ status: "sent", provider_id: result.id })
        .eq("lead_id", lead.id)
        .eq("step", step);
      sent += 1;
    } else {
      // Release the claim so the next run retries instead of losing the step.
      await admin.from("marketing_emails").delete().eq("lead_id", lead.id).eq("step", step);
      failures.push(
        `lead ${lead.id} step ${step}: ${result.ok ? "sender not configured" : result.error}`,
      );
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    dryRun,
    candidates: rows.length,
    sent,
    planned: dryRun ? planned : undefined,
    failures,
  });
}
