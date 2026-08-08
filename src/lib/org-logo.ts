import type { SupabaseClient } from "@supabase/supabase-js";

/** Public URL for org logo in the org-logos bucket. */
export function orgLogoPublicUrl(orgId: string, cacheBust?: string | number) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !orgId) return null;
  const url = `${base.replace(/\/$/, "")}/storage/v1/object/public/org-logos/${orgId}/logo.png`;
  return cacheBust ? `${url}?v=${cacheBust}` : url;
}

export function orgLogoStoragePath(orgId: string) {
  return `${orgId}/logo.png`;
}

/** Prefer DB logo_url (data URL or http). Else recover from Storage if present. */
export async function resolveOrgLogoUrl(
  client: SupabaseClient,
  orgId: string,
  storedUrl?: string | null
): Promise<string | null> {
  if (storedUrl?.startsWith("data:image/") || storedUrl?.startsWith("http")) {
    return storedUrl;
  }
  if (storedUrl) return storedUrl;

  try {
    const { data: files, error } = await client.storage.from("org-logos").list(orgId, {
      search: "logo",
      limit: 10,
    });
    if (error || !files?.some((f) => f.name === "logo.png" || f.name.startsWith("logo."))) {
      // Fallback: HEAD the public URL (works when bucket is public).
      const guess = orgLogoPublicUrl(orgId);
      if (!guess) return null;
      const head = await fetch(guess, { method: "HEAD", cache: "no-store" });
      if (!head.ok) return null;
      return orgLogoPublicUrl(orgId, Date.now());
    }
    return orgLogoPublicUrl(orgId, Date.now());
  } catch {
    return null;
  }
}
