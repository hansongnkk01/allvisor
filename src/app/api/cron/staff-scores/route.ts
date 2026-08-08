import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { formatDayKeyMY } from "@/lib/datetime-my";
import { computeStaffScores, saveStaffScores } from "@/lib/staff-scores";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nightly scoring for every organization. Runs with the service role because it
 * has no user session; Vercel Cron calls it with the CRON_SECRET bearer token.
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

  const { data: orgs, error } = await admin.from("organizations").select("id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Yesterday closes the books; today keeps the dashboard fresh before midnight.
  const now = new Date();
  const days = [formatDayKeyMY(new Date(now.getTime() - 86400000)), formatDayKeyMY(now)];

  let saved = 0;
  const failures: string[] = [];
  for (const org of orgs || []) {
    for (const day of days) {
      try {
        const rows = await computeStaffScores({ supabase: admin, orgId: org.id, day });
        const result = await saveStaffScores(admin, rows);
        saved += result.saved;
        if (result.error) failures.push(`${org.id} ${day}: ${result.error}`);
      } catch (err) {
        failures.push(`${org.id} ${day}: ${(err as Error).message}`);
      }
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    organizations: (orgs || []).length,
    days,
    saved,
    failures,
  });
}
