import { hasCapability } from "@/lib/niche-capabilities";
import type { Niche } from "@/lib/types";

export type MarketingPlay = {
  id: string;
  title: string;
  body: string;
};

type Bilingual = { en: string; ms: string };

type PlayDef = {
  id: string;
  /** Play only shows when the niche has this capability. Omit for universal plays. */
  requires?: Parameters<typeof hasCapability>[1];
  title: Bilingual;
  body: Bilingual;
};

const PLAYS: PlayDef[] = [
  {
    id: "winback",
    title: { en: "Win back quiet customers", ms: "Tarik balik pelanggan senyap" },
    body: {
      en: "Filter customers with no visit in 60 days and send one personal message with a reason to return.",
      ms: "Tapis pelanggan yang tiada kunjungan 60 hari dan hantar satu mesej peribadi dengan sebab untuk kembali.",
    },
  },
  {
    id: "collect",
    title: { en: "Collect what is already owed", ms: "Kutip apa yang sudah terhutang" },
    body: {
      en: "Chase overdue invoices before spending on new leads. It is the cheapest cash you will find this month.",
      ms: "Kejar invois tertunggak sebelum belanja untuk lead baharu. Ini duit termurah yang anda akan jumpa bulan ini.",
    },
  },
  {
    id: "review",
    title: { en: "Turn happy customers into reviews", ms: "Tukar pelanggan gembira jadi ulasan" },
    body: {
      en: "Ask for a Google review right after a good visit, while the experience is still fresh.",
      ms: "Minta ulasan Google sebaik selepas kunjungan yang baik, semasa pengalaman masih segar.",
    },
  },
  {
    id: "bundle",
    requires: "pos",
    title: { en: "Bundle your top seller", ms: "Bundel produk paling laris" },
    body: {
      en: "Pair your best seller with a slow mover at a small discount to clear stock without cutting your hero price.",
      ms: "Gandingkan produk paling laris dengan yang perlahan pada diskaun kecil untuk habiskan stok tanpa potong harga utama.",
    },
  },
  {
    id: "rebook",
    requires: "appointments",
    title: { en: "Rebook before they leave", ms: "Tempah semula sebelum mereka pulang" },
    body: {
      en: "Book the next visit at the counter. A booked slot beats a reminder message every time.",
      ms: "Tempah lawatan seterusnya di kaunter. Slot yang ditempah lebih baik daripada mesej peringatan.",
    },
  },
  {
    id: "renewal",
    requires: "memberships",
    title: { en: "Save expiring memberships", ms: "Selamatkan keahlian yang tamat" },
    body: {
      en: "Reach members two weeks before expiry with a renewal offer instead of waiting for churn.",
      ms: "Hubungi ahli dua minggu sebelum tamat dengan tawaran pembaharuan, jangan tunggu mereka hilang.",
    },
  },
  {
    id: "term",
    requires: "term_fees",
    title: { en: "Fill next term early", ms: "Penuhkan penggal seterusnya awal" },
    body: {
      en: "Open next term registration to current parents first. Existing families are the cheapest enrolment you have.",
      ms: "Buka pendaftaran penggal seterusnya kepada ibu bapa sedia ada dahulu. Keluarga sedia ada adalah pendaftaran termurah.",
    },
  },
  {
    id: "recall",
    requires: "pet_vaccinations",
    title: { en: "Run a vaccination recall", ms: "Jalankan panggilan semula vaksinasi" },
    body: {
      en: "List vaccinations due this month and contact owners. It is service and revenue at the same time.",
      ms: "Senaraikan vaksinasi yang perlu bulan ini dan hubungi pemilik. Ia servis dan hasil serentak.",
    },
  },
  {
    id: "occupancy",
    requires: "rooms",
    title: { en: "Price the quiet nights", ms: "Harga untuk malam sepi" },
    body: {
      en: "Look at the weekdays that stay empty and run a short stay offer for those nights only.",
      ms: "Lihat hari biasa yang kosong dan jalankan tawaran menginap pendek untuk malam itu sahaja.",
    },
  },
  {
    id: "referral",
    requires: "project_claims",
    title: { en: "Ask past clients for referrals", ms: "Minta rujukan daripada klien lepas" },
    body: {
      en: "Completed projects are your portfolio. Ask each finished client for one introduction.",
      ms: "Projek siap adalah portfolio anda. Minta setiap klien yang selesai untuk satu perkenalan.",
    },
  },
];

export function marketingPlays(niche: Niche | string, locale: string): MarketingPlay[] {
  const lang: keyof Bilingual = locale === "en" ? "en" : "ms";
  return PLAYS.filter((play) => !play.requires || hasCapability(niche, play.requires)).map(
    (play) => ({
      id: play.id,
      title: play.title[lang],
      body: play.body[lang],
    })
  );
}
