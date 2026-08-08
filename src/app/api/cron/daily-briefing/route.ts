import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { generateBriefing } from "@/lib/briefing";
import { sendToChannels } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Nightly briefing for every Ops-Brain-enabled organization: generate the
 * daily summary (LLM or rule fallback) and push it to the enabled channels.
 * Runs with the service role; Vercel Cron calls it with the CRON_SECRET bearer.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 500 });
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, serviceKey);

  // Every organisation gets a briefing — the AI supervisor is always on.
  const { data: orgs, error } = await admin
    .from("organizations")
    .select("id, locale_default");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  let generated = 0;
  let delivered = 0;
  const failures: string[] = [];

  for (const org of orgs || []) {
    try {
      const briefing = await generateBriefing({
        supabase: admin,
        orgId: org.id,
        locale: String(org.locale_default || "ms"),
        now,
      });
      if (!briefing) continue;
      generated += 1;
      const result = await sendToChannels(admin, org.id, briefing.content);
      delivered += result.sent;
      if (result.failed > 0) failures.push(`${org.id}: ${result.failed} channel(s) failed`);
    } catch (err) {
      failures.push(`${org.id}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    organizations: (orgs || []).length,
    generated,
    delivered,
    failures,
  });
}
