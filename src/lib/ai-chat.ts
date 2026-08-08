import { chatCompletion, llmConfigured } from "@/lib/llm";
import { formatCurrency } from "@/lib/utils";
import type { BriefingContext } from "@/lib/briefing";

/**
 * Owner chat brain. The LLM answers strictly from the data snapshot; when it
 * is not configured (or fails) the rule-based matcher answers the common
 * questions from the same snapshot. Either way the reply is grounded in real
 * numbers — the AI never invents figures.
 */

export type OwnerAnswer = { text: string; model: string };

function mentionsAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

/** Deterministic answers for the questions owners actually ask. */
export function answerFromRules(question: string, ctx: BriefingContext, ms: boolean): string {
  const q = question.toLowerCase();
  const profit = ctx.incomeMonth - ctx.expenseMonth;

  if (mentionsAny(q, ["jualan", "sales", "jual", "sale"])) {
    return ms
      ? `Jualan hari ini ialah ${formatCurrency(ctx.salesToday)} daripada ${ctx.txnToday} transaksi. Bulan ini: pendapatan ${formatCurrency(ctx.incomeMonth)}, perbelanjaan ${formatCurrency(ctx.expenseMonth)}.`
      : `Sales today are ${formatCurrency(ctx.salesToday)} across ${ctx.txnToday} transactions. This month: income ${formatCurrency(ctx.incomeMonth)}, expenses ${formatCurrency(ctx.expenseMonth)}.`;
  }

  if (mentionsAny(q, ["untung", "profit", "rugi", "loss", "margin"])) {
    return ms
      ? `Untung bulan ini setakat ini ialah ${formatCurrency(profit)} (pendapatan ${formatCurrency(ctx.incomeMonth)} tolak perbelanjaan ${formatCurrency(ctx.expenseMonth)}).`
      : `Profit this month so far is ${formatCurrency(profit)} (income ${formatCurrency(ctx.incomeMonth)} minus expenses ${formatCurrency(ctx.expenseMonth)}).`;
  }

  if (mentionsAny(q, ["alert", "amaran", "masalah", "problem", "issue", "curig", "suspicious"])) {
    if (!ctx.openAlerts.length) {
      return ms
        ? "Tiada alert aktif sekarang. Operasi berjalan lancar."
        : "There are no active alerts right now. Operations are running smoothly.";
    }
    const top = ctx.openAlerts
      .slice(0, 3)
      .map((alert) => `- [${alert.severity.toUpperCase()}] ${alert.title}${alert.staffName ? ` — ${alert.staffName}` : ""}`)
      .join("\n");
    return ms
      ? `Ada ${ctx.openAlerts.length} alert aktif. Paling penting:\n${top}`
      : `There are ${ctx.openAlerts.length} active alerts. Most important:\n${top}`;
  }

  if (mentionsAny(q, ["staf", "staff", "pekerja", "terbaik", "best", "prestasi", "performance", "skor", "score"])) {
    const best = ctx.ranking[0];
    if (!best) {
      return ms
        ? "Belum ada skor staf untuk hari ini. Skor dikira setiap malam secara automatik."
        : "There are no staff scores for today yet. Scores are computed automatically every night.";
    }
    const list = ctx.ranking
      .slice(0, 3)
      .map((entry, index) => `${index + 1}. ${entry.name} — ${Math.round(entry.score)}% (${formatCurrency(entry.sales)})`)
      .join("\n");
    return ms ? `Kedudukan staf hari ini:\n${list}` : `Staff ranking today:\n${list}`;
  }

  if (mentionsAny(q, ["stok", "stock", "inventori", "inventory", "barang"])) {
    if (!ctx.lowStock.length) {
      return ms
        ? "Tiada item di bawah paras stok minimum sekarang."
        : "No items are below their minimum stock level right now.";
    }
    return ms
      ? `${ctx.lowStock.length} item rendah stok: ${ctx.lowStock.join(", ")}. Cadangan: buat pesanan semula hari ini.`
      : `${ctx.lowStock.length} low-stock items: ${ctx.lowStock.join(", ")}. Suggestion: place a reorder today.`;
  }

  if (mentionsAny(q, ["tugas", "task", "kerja", "todo"])) {
    return ms
      ? `Ada ${ctx.openTasks} tugasan masih terbuka. Buka kad Tugasan di dashboard untuk menyemak dan menandakan siap.`
      : `There are ${ctx.openTasks} open tasks. Open the Tasks card on the dashboard to review and mark them done.`;
  }

  // Default: an honest summary plus what can be asked.
  return ms
    ? `Ringkasan sekarang: jualan hari ini ${formatCurrency(ctx.salesToday)}, ${ctx.openAlerts.length} alert aktif, ${ctx.lowStock.length} item stok rendah, ${ctx.openTasks} tugasan terbuka. Anda boleh tanya tentang jualan, untung, alert, prestasi staf, stok atau tugasan.`
    : `Current summary: sales today ${formatCurrency(ctx.salesToday)}, ${ctx.openAlerts.length} active alerts, ${ctx.lowStock.length} low-stock items, ${ctx.openTasks} open tasks. You can ask about sales, profit, alerts, staff performance, stock or tasks.`;
}

/**
 * Answers an owner's question. Tries the LLM with the snapshot as hard system
 * context; falls back to the rule matcher. Never throws.
 */
export async function answerOwnerQuestion({
  question,
  history,
  context,
  ms,
}: {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  context: BriefingContext;
  ms: boolean;
}): Promise<OwnerAnswer> {
  if (llmConfigured()) {
    const system = ms
      ? "Anda ialah Penyelia AI Allvisor, pembantu pemilik perniagaan. Jawab dalam Bahasa Malaysia, ringkas (maksimum 120 patah perkataan). Gunakan HANYA data JSON berikut sebagai sumber fakta — jangan reka angka atau peristiwa. Jika jawapan tiada dalam data, katakan dengan jujur dan cadangkan halaman sistem untuk menyemak. Data: " +
        JSON.stringify(context)
      : "You are the Allvisor AI Supervisor, the business owner's assistant. Answer concisely (max 120 words). Use ONLY the following JSON data as the source of truth — never invent figures or events. If the answer is not in the data, say so honestly and suggest where to check in the app. Data: " +
        JSON.stringify(context);
    const result = await chatCompletion(
      [
        { role: "system", content: system },
        ...history.slice(-8),
        { role: "user", content: question },
      ],
      { maxTokens: 400, temperature: 0.3 }
    );
    if (result) return { text: result.text, model: result.model };
  }
  return { text: answerFromRules(question, context, ms), model: "rules" };
}
