import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * One-click unsubscribe. Reached two ways: the link at the foot of every
 * sequence email (GET), and the inbox provider's own unsubscribe button, which
 * posts to the List-Unsubscribe header without ever loading the page (POST).
 */

async function unsubscribe(token: string | null) {
  if (!token) return false;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return false;

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, serviceKey);

  const { error } = await admin
    .from("marketing_leads")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .is("unsubscribed_at", null);

  // An already-unsubscribed token updates nothing, which is still a success as
  // far as the reader is concerned.
  return !error;
}

function page(title: string, body: string) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:1.5rem;
    font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
    background:#f6f7f9;color:#111827}
  main{max-width:30rem;text-align:center;background:#fff;padding:2.5rem 2rem;
    border-radius:16px;border:1px solid #e5e7eb}
  h1{margin:0 0 .6rem;font-size:1.35rem;letter-spacing:-.02em}
  p{margin:0;color:#6b7280}
  a{display:inline-block;margin-top:1.5rem;color:#111827}
</style></head>
<body><main><h1>${title}</h1><p>${body}</p>
<a href="/">Allvisor</a></main></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const done = await unsubscribe(token);

  return done
    ? page("You're unsubscribed", "You won't receive any more emails from us. The playbook stays yours to keep.")
    : page("That link didn't work", "The unsubscribe link looks incomplete. Reply to any of our emails and we'll remove you by hand.");
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  await unsubscribe(token);
  // RFC 8058 wants a plain 200 with no body for one-click.
  return new NextResponse(null, { status: 200 });
}
