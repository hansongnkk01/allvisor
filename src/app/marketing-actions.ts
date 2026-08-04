"use server";

import { createClient } from "@/lib/supabase/server";

export type HvcoResult = { ok: true } | { ok: false; error: string };

export async function submitHvcoLeadAction(formData: FormData): Promise<HvcoResult> {
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const locale = String(formData.get("locale") || "ms").trim();
  const source = String(formData.get("source") || "hvco_start").trim();

  if (!fullName || fullName.length < 2) {
    return { ok: false, error: "name" };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "email" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("marketing_leads").insert({
      full_name: fullName,
      email,
      locale: locale.slice(0, 8),
      source: source.slice(0, 64),
    });

    // Still allow download path even if table missing / RLS not applied yet
    if (error) {
      console.error("[hvco] insert failed", error.message);
    }
    return { ok: true };
  } catch (e) {
    console.error("[hvco] unexpected", e);
    return { ok: true };
  }
}
