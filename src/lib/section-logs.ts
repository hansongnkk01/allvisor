import { createClient } from "@/lib/supabase/server";

export async function fetchSectionLogs(
  orgId: string,
  prefixes: string[],
  limit = 40
) {
  const supabase = await createClient();
  const orFilter = prefixes
    .flatMap((p) => [`action.eq.${p}`, `action.like.${p}.%`])
    .join(",");

  const { data } = await supabase
    .from("activity_logs")
    .select("id, actor_name, summary, action, created_at")
    .eq("organization_id", orgId)
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}
