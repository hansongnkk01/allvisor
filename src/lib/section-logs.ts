import { createClient } from "@/lib/supabase/server";

export async function fetchSectionLogs(
  orgId: string,
  prefixes: string[],
  limit = 40
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select("id, actor_name, summary, action, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(120);

  const logs = (data || []).filter((row) =>
    prefixes.some((p) => row.action === p || row.action.startsWith(`${p}.`) || row.action.startsWith(p))
  );
  return logs.slice(0, limit);
}
