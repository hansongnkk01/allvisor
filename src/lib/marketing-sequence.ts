/**
 * The follow-up sequence behind the /start playbook.
 *
 * Each email hands the reader a calculation they can finish tonight and end up
 * holding a real number about their own business. That is the point: a lead who
 * has worked out that their shrinkage costs RM31,000 a year does not need to be
 * sold to. Only the last email pitches, and even the middle ones keep the offer
 * in the P.S. so the body stands alone as something worth reading.
 *
 * Copy lives here rather than in messages/*.json because these strings are
 * server-only and would otherwise ship to every browser that loads the app.
 */

export type SequenceLocale = "ms" | "en";

export type SequenceEmail = {
  step: number;
  /** Days after opt-in that this email becomes due. */
  offsetDays: number;
  subject: string;
  preheader: string;
  body: string;
};

export type SequenceContext = {
  name: string;
  playbookUrl: string;
  trialUrl: string;
  unsubscribeUrl: string;
};

/** Day offsets. Suby's rule: let them sit a day or two at each step. */
export const SEQUENCE_OFFSET_DAYS = [0, 2, 4, 7, 10] as const;
export const SEQUENCE_LENGTH = SEQUENCE_OFFSET_DAYS.length;

/** First name only. "Ahmad bin Ismail" in a greeting reads like a bank letter. */
function firstName(full: string) {
  const first = full.trim().split(/\s+/)[0] || "";
  return first.length > 1 ? first : full.trim();
}

function signature(locale: SequenceLocale, unsubscribeUrl: string) {
  return locale === "ms"
    ? `\n\n—\nAllvisor\n\nTak mahu e-mel ini lagi? Berhenti di sini: ${unsubscribeUrl}`
    : `\n\n—\nAllvisor\n\nDone with these? Unsubscribe here: ${unsubscribeUrl}`;
}

type Builder = (c: SequenceContext & { first: string }) => Omit<SequenceEmail, "step" | "offsetDays">;

const MS: Builder[] = [
  ({ first, playbookUrl }) => ({
    subject: "enam soalan",
    preheader: "Jawab jujur, sebab tiada siapa nampak jawapan anda",
    body: `${first},

Terima kasih ambil playbook itu. Sebelum anda lupa ia wujud, buat satu benda malam ini.

Buka bahagian audit LHDN — enam soalan. Jawab jujur. Ambil masa empat minit.

Kebanyakan pemilik yang saya jumpa jawab "tidak pasti" untuk sekurang-kurangnya tiga daripada enam. Itu bukan kegagalan; itu bermakna anda baru sahaja jumpa tiga perkara yang boleh jadi masalah pada masa yang paling teruk, semasa anda masih ada masa membetulkannya dengan tenang.

Playbook: ${playbookUrl}

Kalau anda dapat enam daripada enam, tahniah dengan ikhlas — anda dalam kalangan minoriti kecil, dan e-mel berikutnya lagi berguna untuk anda.

Dua hari lagi saya hantar satu kiraan mudah. Ia mengambil masa sepuluh minit dan ia menghasilkan satu nombor yang selalunya membuat pemilik duduk diam sekejap. Saya sendiri tak suka nombor itu bila mula-mula mengiranya.`,
  }),

  ({ first }) => ({
    subject: "ujian dua peratus",
    preheader: "Ambil kalkulator. Nombor ini biasanya lebih besar daripada sangkaan",
    body: `${first},

Ini kiraan yang saya janjikan. Sepuluh minit.

1. Ambil jumlah jualan anda bulan lepas.
2. Darab dengan 0.02.
3. Darab dengan 12.

Itulah kos setahun kalau dua peratus stok anda hilang tanpa penjelasan. Dua peratus ialah angka yang agak biasa untuk kedai kecil yang tak mengira stok secara berkala — ada yang lebih rendah, ada yang jauh lebih tinggi.

Kedai runcit dengan jualan RM130,000 sebulan mendapat RM31,200 setahun. Itu bukan kecurian dramatik. Itu barang rosak yang tak direkod, diskaun yang diberi tanpa kebenaran, jualan yang di-void selepas duit masuk laci, dan stok yang tersalah kira semasa terima.

Sekarang bandingkan nombor itu dengan apa yang anda bayar untuk sistem, akauntan, atau apa-apa sahaja yang anda pernah teragak-agak nak belanja tahun ini.

Perkara yang paling penting: anda tak boleh baiki apa yang anda tak ukur. Kalau anda tak tahu kadar sebenar anda, anggapan dua peratus itu tinggal anggapan.

Dua hari lagi saya tunjukkan cara mengetahui siapa punca kebocoran itu, tanpa perlu tuduh sesiapa dan tanpa perlu beli apa-apa. Satu buku nota sudah memadai.

P.S. Playbook itu ada senarai 11 perangkap yang menyebabkan angka dua peratus ini membesar. Perangkap nombor empat yang paling kerap saya lihat.`,
  }),

  ({ first, trialUrl }) => ({
    subject: "satu nombor",
    preheader: "Cara jumpa punca kebocoran tanpa menuduh sesiapa",
    body: `${first},

Ini boleh dibuat dengan buku nota dan tujuh hari. Tiada software diperlukan.

Setiap kali seorang staf membatalkan jualan, memberi diskaun, atau memulangkan barang, catat satu baris: tarikh, nama staf, jumlah. Itu sahaja. Jangan umumkan yang anda sedang mencatat, dan jangan tuduh sesiapa.

Selepas tujuh hari, kira jumlah setiap orang.

Apa yang biasanya berlaku: kebanyakan staf berkumpul dalam julat yang sama, dan seorang berada jauh di luar julat itu. Kadangkala tiga hingga empat kali ganda orang lain.

Yang penting, itu belum tentu kecurian. Selalunya bukan. Kadangkala orang itu yang paling sibuk dan paling banyak menguruskan pelanggan susah. Kadangkala dia satu-satunya yang tahu cara memproses pulangan, jadi semua pulangan melalui dia. Kadangkala dia tidak pernah dilatih dengan betul.

Tetapi anda kini ada soalan yang tepat untuk ditanya, kepada orang yang tepat, dengan angka di tangan. Itu perbualan yang sangat berbeza daripada "saya rasa ada sesuatu tak kena".

Buat sekarang, sementara ia masih segar. Tujuh hari, satu buku nota.

Tiga hari lagi: duit mati atas rak anda. Ini yang paling ramai pemilik terkejut, sebab wangnya sudah pun dibelanjakan dan mereka lupa ia ada di sana.

P.S. Allvisor mencatat baris itu secara automatik untuk setiap staf dan mengira skor harian setiap malam, jadi anda tak perlu ingat untuk mencatat. Trial tiga hari, tiada kad: ${trialUrl}`,
  }),

  ({ first, trialUrl }) => ({
    subject: "duit mati",
    preheader: "Wang ini sudah anda belanjakan. Ia cuma tak berpusing",
    body: `${first},

Berjalan ke rak anda malam ini dengan satu soalan: barang mana yang tidak terjual sejak dua bulan lepas?

Kira nilai kos barang-barang itu. Bukan harga jualan — kos. Jumlahkan.

Itulah wang anda sendiri yang sedang duduk diam. Anda sudah bayar untuknya. Ia tidak menjana apa-apa, ia mengambil ruang rak yang sepatutnya diisi barang laris, dan setiap bulan ia tinggal di situ, ia semakin sukar dijual.

Bagi kebanyakan kedai kecil angka ini antara RM8,000 hingga RM40,000. Bagi kedai fesyen dan elektronik ia biasanya lebih tinggi, sebab satu unit pun sudah mahal.

Tiga perkara yang boleh dibuat minggu ini:

Satu, bundle. Gandingkan barang mati dengan barang laris pada harga yang masuk akal. Anda memulihkan kos, bukan mengejar untung.

Dua, hentikan pembelian semula. Bunyinya jelas, tetapi banyak PO diulang secara automatik berdasarkan tabiat, bukan data.

Tiga, tetapkan had. Tiada barang dibenarkan duduk melebihi 90 hari tanpa keputusan sedar — turun harga, bundle, atau pulangkan kepada pembekal.

Anda kini ada empat nombor tentang perniagaan anda sendiri: jurang audit anda, kos kebocoran tahunan anda, staf yang berada di luar julat, dan wang yang mati atas rak.

Tiga hari lagi saya hantar e-mel terakhir dalam siri ini. Ia lebih pendek, dan ia jujur tentang apa yang saya mahu daripada anda.

P.S. Allvisor menandakan barang tanpa pergerakan secara automatik dan memberitahu anda sebelum ia mencecah 90 hari: ${trialUrl}`,
  }),

  ({ first, trialUrl, playbookUrl }) => ({
    subject: "yang terakhir",
    preheader: "Empat nombor, dan satu permintaan yang jujur",
    body: `${first},

Ini yang terakhir, jadi biar saya terus terang.

Sepanjang dua minggu ini saya beri anda empat kiraan. Kalau anda buat kesemuanya, anda kini tahu jurang audit anda, kos kebocoran tahunan anda, staf mana yang berada di luar julat, dan berapa banyak wang anda yang mati atas rak.

Perhatikan satu perkara tentang keempat-empatnya: setiap satu memerlukan anda berhenti, mengira secara manual, dan mengingatinya. Itulah sebabnya kebanyakan pemilik hanya membuatnya sekali. Bukan kerana malas — kerana anda menjalankan perniagaan, bukan menjalankan laporan.

Itulah yang Allvisor buat. Empat nombor itu dikira setiap hari tanpa anda menyentuh apa-apa, dan anda hanya diberitahu bila salah satu daripadanya bergerak ke arah yang salah.

Trial tiga hari, tiada kad kredit, dan kami tutup akaun terus kalau selepas satu hari niaga ia tak tunjuk sekurang-kurangnya satu perkara tentang perniagaan anda yang anda belum tahu.

Mula di sini: ${trialUrl}

Kalau sekarang bukan masanya, tidak mengapa dan saya tidak akan menghantar siri ini lagi. Simpan playbook itu — ia berguna walaupun anda tak pernah membuka Allvisor: ${playbookUrl}

P.S. Satu amaran yang berbaloi diambil serius. Pemilik yang tangguhkan perkara ini bukannya yang memutuskan tidak mahu. Mereka ialah yang asyik berniat nak tengok nanti, sampailah satu deadline atau satu percanggahan membuat keputusan itu bagi pihak mereka, pada masa yang paling teruk. Harga perintis masih terbuka buat masa ini: ${trialUrl}`,
  }),
];

const EN: Builder[] = [
  ({ first, playbookUrl }) => ({
    subject: "six questions",
    preheader: "Answer honestly, nobody sees your answers",
    body: `${first},

Thanks for taking the playbook. Before you forget it exists, do one thing tonight.

Open the LHDN audit section — six questions. Answer them honestly. It takes four minutes.

Most owners I meet answer "not sure" to at least three of the six. That is not a failure; it means you have just found three things that could become a problem at the worst possible moment, while you still have time to fix them calmly.

Playbook: ${playbookUrl}

If you get six out of six, genuine congratulations — you are in a small minority, and the next emails are even more useful to you.

In two days I will send you a simple calculation. It takes ten minutes and it produces a number that usually makes owners go quiet for a moment. I did not enjoy that number when I first worked it out either.`,
  }),

  ({ first }) => ({
    subject: "the two percent test",
    preheader: "Get a calculator. This is usually bigger than people expect",
    body: `${first},

Here is the calculation I promised. Ten minutes.

1. Take last month's sales.
2. Multiply by 0.02.
3. Multiply by 12.

That is your annual cost if two percent of your stock disappears without an explanation. Two percent is a fairly ordinary figure for a small shop that does not count stock regularly — some are lower, plenty are far higher.

A grocery doing RM130,000 a month gets RM31,200 a year. That is not dramatic theft. That is damaged goods nobody recorded, discounts given without approval, sales voided after the cash went in the drawer, and stock miscounted on receiving.

Now hold that number next to whatever you pay for a system, an accountant, or anything else you have hesitated to spend on this year.

The part that matters most: you cannot fix what you do not measure. If you do not know your real rate, that two percent stays a guess.

In two days I will show you how to find where the leak is coming from, without accusing anyone and without buying anything. A notebook is enough.

P.S. The playbook lists the 11 traps that make this two percent grow. Trap number four is the one I see most often.`,
  }),

  ({ first, trialUrl }) => ({
    subject: "one number",
    preheader: "How to find the leak without accusing anybody",
    body: `${first},

You can do this with a notebook and seven days. No software required.

Every time a staff member voids a sale, gives a discount, or processes a return, write one line: date, staff name, amount. That is all. Do not announce that you are keeping the list, and do not accuse anybody.

After seven days, total it per person.

What usually happens: most of your staff cluster in the same range, and one person sits well outside it. Sometimes three or four times everyone else.

Importantly, that is not necessarily theft. Usually it is not. Sometimes that person is the busiest and handles the difficult customers. Sometimes they are the only one who knows how to process a return, so every return goes through them. Sometimes they were never trained properly.

But you now have the right question, for the right person, with a number in hand. That is a very different conversation from "I feel like something is off".

Do it now, while it is fresh. Seven days, one notebook.

In three days: the dead money on your shelves. This is the one that surprises the most owners, because the cash is already spent and they have forgotten it is sitting there.

P.S. Allvisor writes that line automatically for every staff member and scores them nightly, so you never have to remember to write it down. Three-day trial, no card: ${trialUrl}`,
  }),

  ({ first, trialUrl }) => ({
    subject: "dead money",
    preheader: "You already spent this. It is just not moving",
    body: `${first},

Walk your shelves tonight with one question: which items have not sold since two months ago?

Add up what those items cost you. Not the selling price — the cost. Total it.

That is your own money sitting still. You have already paid for it. It earns nothing, it occupies shelf space that should hold something that sells, and every month it stays there it gets harder to move.

For most small shops this lands between RM8,000 and RM40,000. For fashion and electronics it is usually higher, because a single unit is expensive to begin with.

Three things you can do this week:

One, bundle. Pair dead items with fast movers at a sensible price. You are recovering cost, not chasing margin.

Two, stop the reorder. It sounds obvious, but plenty of purchase orders repeat on habit rather than on data.

Three, set a limit. Nothing is allowed to sit past 90 days without a conscious decision — mark it down, bundle it, or return it to the supplier.

You now have four numbers about your own business: your audit gaps, your annual leakage cost, the staff member outside the range, and the money dead on your shelves.

In three days I will send the last email in this series. It is shorter, and it is honest about what I want from you.

P.S. Allvisor flags non-moving stock automatically and tells you before it hits 90 days: ${trialUrl}`,
  }),

  ({ first, trialUrl, playbookUrl }) => ({
    subject: "the last one",
    preheader: "Four numbers, and one honest ask",
    body: `${first},

This is the last one, so let me be direct.

Over the past two weeks I gave you four calculations. If you did all of them, you now know your audit gaps, your annual leakage cost, which staff member sits outside the range, and how much of your money is dead on the shelves.

Notice one thing about all four: each of them required you to stop, work it out by hand, and remember to do it. That is why most owners do it once. Not laziness — you run a business, not a reporting department.

That is the job Allvisor does. Those four numbers get calculated every day without you touching anything, and you only hear about one when it moves in the wrong direction.

Three-day trial, no credit card, and we close the account on the spot if after one trading day it has not shown you at least one thing about your business you did not already know.

Start here: ${trialUrl}

If now is not the time, that is genuinely fine and I will not send this series again. Keep the playbook — it is useful whether or not you ever open Allvisor: ${playbookUrl}

P.S. One warning worth taking seriously. The owners who put this off are not the ones who decide against it. They are the ones who keep meaning to look at it until a deadline or a discrepancy makes the decision for them, at the worst possible moment. The founding price is still open for now: ${trialUrl}`,
  }),
];

export function buildSequenceEmail(
  step: number,
  locale: SequenceLocale,
  ctx: SequenceContext,
): SequenceEmail | null {
  const builders = locale === "en" ? EN : MS;
  const build = builders[step];
  if (!build) return null;

  const parts = build({ ...ctx, first: firstName(ctx.name) });
  return {
    step,
    offsetDays: SEQUENCE_OFFSET_DAYS[step],
    subject: parts.subject,
    preheader: parts.preheader,
    body: `${parts.body}${signature(locale, ctx.unsubscribeUrl)}`,
  };
}

/** Which step is due for a lead, or null when nothing is owed yet. */
export function nextDueStep(
  optedInAt: Date,
  sentSteps: number[],
  now: Date,
): number | null {
  const elapsedDays = (now.getTime() - optedInAt.getTime()) / 86400000;
  for (let step = 0; step < SEQUENCE_LENGTH; step += 1) {
    if (sentSteps.includes(step)) continue;
    if (elapsedDays >= SEQUENCE_OFFSET_DAYS[step]) return step;
    // Steps are ordered, so the first unmet offset ends the search.
    return null;
  }
  return null;
}
