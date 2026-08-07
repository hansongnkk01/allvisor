import { hasCapability } from "@/lib/niche-capabilities";
import type { Niche } from "@/lib/types";

export type MarketingPlay = {
  title: string;
  detail: string;
  effort: "low" | "medium";
};

/**
 * Rule-based marketing suggestions. Deliberately deterministic so the admin
 * dashboard and this page stay consistent without an LLM call.
 */
export function buildMarketingPlays(input: {
  niche: Niche | string;
  locale: string;
  entityLabel: string;
  dormant: number;
  newCount: number;
  avgValue: number;
}): MarketingPlay[] {
  const ms = input.locale === "ms";
  const plays: MarketingPlay[] = [];
  const entity = input.entityLabel.toLowerCase();

  if (input.dormant > 0) {
    plays.push({
      title: ms ? `Win-back ${input.dormant} ${entity} tidak aktif` : `Win back ${input.dormant} dormant ${entity}`,
      detail: ms
        ? "Hantar mesej WhatsApp peribadi dengan tawaran terhad kepada mereka yang tiada transaksi 60 hari."
        : "Send a personal WhatsApp with a limited offer to everyone with no transaction in 60 days.",
      effort: "low",
    });
  }

  if (input.newCount > 0) {
    plays.push({
      title: ms ? `Susulan untuk ${input.newCount} pelanggan baharu` : `Follow up ${input.newCount} new customers`,
      detail: ms
        ? "Minta ulasan Google dan tawarkan insentif rujukan sementara pengalaman mereka masih segar."
        : "Ask for a Google review and offer a referral incentive while the experience is still fresh.",
      effort: "low",
    });
  }

  if (hasCapability(input.niche, "appointments")) {
    plays.push({
      title: ms ? "Peringatan temujanji susulan" : "Recall reminders for follow-up visits",
      detail: ms
        ? "Jana senarai yang patut datang semula bulan ini dan hantar peringatan sehari sebelum."
        : "Generate the list due for a return visit this month and remind them a day ahead.",
      effort: "medium",
    });
  }

  if (hasCapability(input.niche, "inventory")) {
    plays.push({
      title: ms ? "Bundle stok bergerak perlahan" : "Bundle slow-moving stock",
      detail: ms
        ? "Gabungkan item laris dengan stok bergerak perlahan pada harga bundle hujung minggu."
        : "Pair a best seller with slow-moving stock as a weekend bundle price.",
      effort: "medium",
    });
  }

  plays.push({
    title: ms ? "Naikkan nilai purata pelanggan" : "Lift average customer value",
    detail: ms
      ? `Nilai purata sekarang ialah RM${input.avgValue.toFixed(0)}. Uji satu tawaran tambahan pada tahap pembayaran.`
      : `Average value is RM${input.avgValue.toFixed(0)}. Test one add-on offer at the payment step.`,
    effort: "low",
  });

  return plays;
}
