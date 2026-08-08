import type { SupabaseClient } from "@supabase/supabase-js";
import { chatCompletion, llmConfigured } from "@/lib/llm";
import { dayBoundsMY, formatDayKeyMY } from "@/lib/datetime-my";
import { formatCurrency } from "@/lib/utils";

/**
 * Daily briefing engine. The LLM never decides anything — it only rewrites a
 * structured snapshot into sentences. Without LLM keys (or on any failure) the
 * rule-based renderer produces the briefing instead, so the card always works.
 */

export type BriefingContext = {
  day: string;
  orgName: string;
  salesToday: number;
  txnToday: number;
  incomeMonth: number;
  expenseMonth: number;
  openAlerts: { severity: string; title: string; message: string; staffName: string | null }[];
  ranking: { name: string; score: number; sales: number }[];
  lowStock: string[];
  openTasks: number;
};

async function soft<T>(promise: PromiseLike<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

/** Gathers the structured snapshot every AI surface shares. */
export async function buildBriefingContext(
  supabase: SupabaseClient,
  orgId: string,
  orgName: string,
  now: Date
): Promise<BriefingContext> {
  const { start: todayStart, end: todayEnd } = dayBoundsMY(now);
  const todayKey = formatDayKeyMY(now);
  const monthStart = `${todayKey.slice(0, 7)}-01`;

  const [paymentsRes, ledgerRes, alertsRes, scoresRes, stockRes, tasksRes] = await Promise.all([
    soft(
      supabase
        .from("payments")
        .select("amount")
        .eq("organization_id", orgId)
        .gte("paid_at", todayStart.toISOString())
        .lte("paid_at", todayEnd.toISOString())
    ),
    soft(
      supabase
        .from("ledger_entries")
        .select("entry_type, amount")
        .eq("organization_id", orgId)
        .gte("entry_date", monthStart)
    ),
    soft(
      supabase
        .from("alerts")
        .select("severity, title, message, related_staff_id")
        .eq("organization_id", orgId)
        .in("status", ["open", "investigating"])
        .order("created_at", { ascending: false })
        .limit(8)
    ),
    soft(
      supabase
        .from("staff_scores")
        .select("user_id, score, sales_amount")
        .eq("organization_id", orgId)
        .eq("score_date", todayKey)
        .order("score", { ascending: false })
        .limit(5)
    ),
    soft(
      supabase
        .from("products")
        .select("name, quantity, low_stock_threshold")
        .eq("organization_id", orgId)
        .limit(1000)
    ),
    soft(
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "open")
    ),
  ]);

  // Names for alert subjects and scorers, resolved without FK-join assumptions.
  const ids = [
    ...new Set([
      ...(alertsRes?.data || []).map((row) => row.related_staff_id as string | null),
      ...(scoresRes?.data || []).map((row) => String(row.user_id)),
    ]),
  ].filter((id): id is string => Boolean(id));
  const names = new Map<string, string>();
  if (ids.length) {
    const profilesRes = await soft(
      supabase.from("profiles").select("id, full_name, email").in("id", ids)
    );
    for (const row of profilesRes?.data || []) {
      names.set(
        String(row.id),
        (row.full_name as string | null) || (row.email as string | null) || "—"
      );
    }
  }

  const severityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const openAlerts = (alertsRes?.data || [])
    .map((row) => ({
      severity: String(row.severity),
      title: String(row.title),
      message: String(row.message),
      staffName: row.related_staff_id ? names.get(String(row.related_staff_id)) ?? null : null,
    }))
    .sort((a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3));

  const lowStock = (stockRes?.data || [])
    .filter((row) => Number(row.quantity) <= Number(row.low_stock_threshold))
    .map((row) => String(row.name || "").trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    day: todayKey,
    orgName,
    // Refund rows are negative amounts — count only real takings as "sales".
    salesToday: (paymentsRes?.data || [])
      .filter((row) => Number(row.amount) > 0)
      .reduce((sum, row) => sum + Number(row.amount), 0),
    txnToday: (paymentsRes?.data || []).filter((row) => Number(row.amount) > 0).length,
    incomeMonth: (ledgerRes?.data || [])
      .filter((row) => row.entry_type === "income")
      .reduce((sum, row) => sum + Number(row.amount), 0),
    expenseMonth: (ledgerRes?.data || [])
      .filter((row) => row.entry_type === "expense")
      .reduce((sum, row) => sum + Number(row.amount), 0),
    openAlerts,
    ranking: (scoresRes?.data || []).map((row) => ({
      name: names.get(String(row.user_id)) || "—",
      score: Number(row.score || 0),
      sales: Number(row.sales_amount || 0),
    })),
    lowStock,
    openTasks: tasksRes?.count ?? 0,
  };
}

const SEVERITY_LABEL = {
  ms: { high: "TINGGI", medium: "SEDERHANA", low: "RENDAH" },
  en: { high: "HIGH", medium: "MEDIUM", low: "LOW" },
} as const;

/** Deterministic briefing text — the fallback when no LLM is configured. */
export function renderRulesBriefing(ctx: BriefingContext, ms: boolean): string {
  const labels = ms ? SEVERITY_LABEL.ms : SEVERITY_LABEL.en;
  const profit = ctx.incomeMonth - ctx.expenseMonth;
  const lines: string[] = [];

  lines.push(
    ms
      ? `Taklimat harian ${ctx.orgName} — ${ctx.day}`
      : `Daily briefing for ${ctx.orgName} — ${ctx.day}`
  );
  lines.push("");
  lines.push(
    ms
      ? `Jualan hari ini: ${formatCurrency(ctx.salesToday)} (${ctx.txnToday} transaksi). Untung bulan ini setakat ini: ${formatCurrency(profit)}.`
      : `Sales today: ${formatCurrency(ctx.salesToday)} (${ctx.txnToday} transactions). Month profit so far: ${formatCurrency(profit)}.`
  );

  if (ctx.openAlerts.length) {
    lines.push("");
    lines.push(ms ? `Perlu perhatian (${ctx.openAlerts.length}):` : `Needs attention (${ctx.openAlerts.length}):`);
    for (const alert of ctx.openAlerts.slice(0, 5)) {
      const label = labels[alert.severity as keyof typeof labels] || alert.severity.toUpperCase();
      lines.push(`- [${label}] ${alert.title}${alert.staffName ? ` — ${alert.staffName}` : ""}`);
    }
  } else {
    lines.push("");
    lines.push(ms ? "Tiada alert aktif. Operasi berjalan lancar." : "No active alerts. Operations are running smoothly.");
  }

  const best = ctx.ranking[0];
  if (best) {
    lines.push("");
    lines.push(
      ms
        ? `Staf terbaik hari ini: ${best.name} (skor ${Math.round(best.score)}%, jualan ${formatCurrency(best.sales)}).`
        : `Top staff today: ${best.name} (score ${Math.round(best.score)}%, sales ${formatCurrency(best.sales)}).`
    );
  }

  if (ctx.lowStock.length) {
    lines.push(
      ms
        ? `Stok rendah: ${ctx.lowStock.join(", ")}.`
        : `Low stock: ${ctx.lowStock.join(", ")}.`
    );
  }

  if (ctx.openTasks > 0) {
    lines.push(
      ms ? `Tugasan masih terbuka: ${ctx.openTasks}.` : `Open tasks: ${ctx.openTasks}.`
    );
  }

  // One honest next action, derived from the same numbers.
  lines.push("");
  const highCount = ctx.openAlerts.filter((alert) => alert.severity === "high").length;
  if (highCount > 0) {
    lines.push(
      ms
        ? `Tindakan: selesaikan ${highCount} alert tinggi dahulu sebelum tutup hari ini.`
        : `Action: work through the ${highCount} high alert(s) before close today.`
    );
  } else if (ctx.lowStock.length) {
    lines.push(
      ms
        ? "Tindakan: buat pesanan semula untuk stok rendah sebelum hujung minggu."
        : "Action: reorder the low-stock items before the weekend."
    );
  } else {
    lines.push(
      ms
        ? "Tindakan: tiada isu kritikal — semak semula petang ini."
        : "Action: no critical issues — check again this evening."
    );
  }

  return lines.join("\n");
}

export type GeneratedBriefing = {
  content: string;
  /** Model name, or "rules" when the fallback produced the text. */
  model: string;
  context: BriefingContext;
};

/**
 * Generates and caches the daily briefing for the org. Returns null when the
 * Ops Brain is switched off. Never throws.
 */
export async function generateBriefing({
  supabase,
  orgId,
  locale,
  now,
  generatedBy,
}: {
  supabase: SupabaseClient;
  orgId: string;
  locale: string;
  now: Date;
  generatedBy?: string | null;
}): Promise<GeneratedBriefing | null> {
  try {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, locale_default")
      .eq("id", orgId)
      .maybeSingle();
    if (orgError || !org) return null;

    const ms = String(locale || org.locale_default || "ms").startsWith("ms");
    const context = await buildBriefingContext(supabase, orgId, String(org.name || ""), now);

    let content: string | null = null;
    let model = "rules";
    if (llmConfigured()) {
      const system = ms
        ? "Anda ialah Penyelia AI Allvisor. Tulis taklimat harian yang ringkas (maksimum 150 patah perkataan) dalam Bahasa Malaysia untuk pemilik perniagaan. Gunakan HANYA angka dalam data JSON yang diberi — jangan reka nombor baharu. Sebut alert severity tinggi dahulu. Akhiri dengan 1-2 tindakan cadangan yang jelas. Format teks biasa, sesuai untuk Telegram."
        : "You are the Allvisor AI Supervisor. Write a concise daily briefing (max 150 words) for the business owner. Use ONLY the numbers in the supplied JSON data — never invent figures. Mention high-severity alerts first. End with 1-2 clear suggested actions. Plain text, suitable for Telegram.";
      const result = await chatCompletion(
        [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(context) },
        ],
        { maxTokens: 600, temperature: 0.3 }
      );
      if (result) {
        content = result.text;
        model = result.model;
      }
    }
    if (!content) {
      content = renderRulesBriefing(context, ms);
    }

    const forDate = context.day;
    const { error: writeError } = await supabase.from("ai_briefings").upsert(
      {
        organization_id: orgId,
        kind: "daily",
        for_date: forDate,
        locale: ms ? "ms" : "en",
        content,
        model,
        context: JSON.parse(JSON.stringify(context)) as Record<string, unknown>,
        generated_by: generatedBy ?? null,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,kind,for_date" }
    );
    if (writeError) return null;

    return { content, model, context };
  } catch {
    return null;
  }
}
