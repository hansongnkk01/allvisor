/**
 * Per-niche vocabulary — UI words + structural flags.
 * Features stay gated by hasCapability(); wording uses getNicheVocab().
 * Never default unknown niches to "clinic".
 */
import type { Niche } from "./types";

export type AccountingFlavor = "care" | "commerce" | "service" | "hospitality" | "specialty";
export type ScorecardVariant = "appointments" | "pos" | "generic";

export type NicheVocabLabels = {
  business: string;
  businessTitle: string;
  entity: string;
  entityPlural: string;
  entityTitle: string;
  schedule: string;
  staffHint: string;
  branchExample: string;
  logoTitle: string;
  accountingTitle: string;
  accountingSubtitle: string;
  hoursTitle: string;
  hoursHint: string;
  chargeTitle: string;
  chargeHint: string;
  thisBranch: string;
  importHint: string;
  importPeople: string;
  importOrder: string;
  businessSettingsHint: string;
  addBranchHint: string;
  addMemberHint: string;
  lhdnSubtitle: string;
  lhdnHowTitle: string;
  lhdnIntermediary: string;
  inventorySubtitle: string;
  inventoryPlaceholder: string;
  deletedTitle: string;
  deletedHint: string;
  activityTitle: string;
  scorecardHint: string;
  saveHours: string;
  holidayNote: string;
};

export type NicheVocab = {
  niche: Niche;
  accountingFlavor: AccountingFlavor;
  scorecard: ScorecardVariant;
  showRisk: boolean;
  showAllergies: boolean;
  showHours: boolean;
  labels: { en: NicheVocabLabels; ms: NicheVocabLabels };
};

function L(en: NicheVocabLabels, ms: NicheVocabLabels): { en: NicheVocabLabels; ms: NicheVocabLabels } {
  return { en, ms };
}

function baseEn(p: Partial<NicheVocabLabels> & Pick<NicheVocabLabels, "business" | "businessTitle" | "entity" | "entityPlural" | "entityTitle" | "branchExample" | "staffHint">): NicheVocabLabels {
  const b = p.business;
  const B = p.businessTitle;
  const e = p.entity;
  const E = p.entityPlural;
  const ET = p.entityTitle;
  return {
    business: b,
    businessTitle: B,
    entity: e,
    entityPlural: E,
    entityTitle: ET,
    schedule: p.schedule || "Appointments",
    staffHint: p.staffHint,
    branchExample: p.branchExample,
    logoTitle: p.logoTitle || `${B} logo`,
    accountingTitle: p.accountingTitle || `${B} accounting`,
    accountingSubtitle:
      p.accountingSubtitle || `Track all cash in and cash out for the ${b}.`,
    hoursTitle: p.hoursTitle || `${B} hours & weekly off`,
    hoursHint:
      p.hoursHint ||
      `Per-branch settings. Controls Dashboard and ${p.schedule || "Appointments"} for this ${b}. Last hour shown = closing hour.`,
    chargeTitle: p.chargeTitle || `${B} charge settings`,
    chargeHint:
      p.chargeHint || `Per-branch service charge applied on invoices for this ${b}.`,
    thisBranch: p.thisBranch || `this ${b}`,
    importHint:
      p.importHint ||
      `Export CSV or Excel from your old ${b} software, then upload here to migrate into Allvisor.`,
    importPeople: p.importPeople || ET,
    importOrder: p.importOrder || `Recommended order: ${ET}.`,
    businessSettingsHint:
      p.businessSettingsHint || `${B} identity used on invoices and LHDN.`,
    addBranchHint:
      p.addBranchHint ||
      `Enter the exact Allvisor ${b} name of another branch (register that ${b} separately first). If you are admin of both, it links immediately and appears in the branch list below. Otherwise their admin must approve.`,
    addMemberHint:
      p.addMemberHint ||
      `Enter a registered Allvisor email to add them as staff / supervisor / manager / co-admin. One account can only join one ${b}. Owner cannot be kicked.`,
    lhdnSubtitle:
      p.lhdnSubtitle ||
      `Allvisor submits e-Invoices to MyInvois as your authorized intermediary. Each ${b} uses its own TIN.`,
    lhdnHowTitle: p.lhdnHowTitle || `How this works for your ${b}`,
    lhdnIntermediary:
      p.lhdnIntermediary ||
      `Intermediary mode: {name} submits on behalf of each ${b}’s TIN via MyInvois.`,
    inventorySubtitle: p.inventorySubtitle || `Stock and supplies for your ${b}.`,
    inventoryPlaceholder: p.inventoryPlaceholder || "Item name",
    deletedTitle: p.deletedTitle || `Deleted ${E}`,
    deletedHint: p.deletedHint || `Audit of who deleted ${e} records.`,
    activityTitle: p.activityTitle || `${ET} activity`,
    scorecardHint:
      p.scorecardHint ||
      `Compare income, unpaid invoices and activity across linked branches.`,
    saveHours: p.saveHours || `Save ${b} hours`,
    holidayNote:
      p.holidayNote ||
      "Malaysian public holidays are auto-highlighted on the timetable for staff to check.",
  };
}

function baseMs(p: Partial<NicheVocabLabels> & Pick<NicheVocabLabels, "business" | "businessTitle" | "entity" | "entityPlural" | "entityTitle" | "branchExample" | "staffHint">): NicheVocabLabels {
  const b = p.business;
  const B = p.businessTitle;
  const e = p.entity;
  const E = p.entityPlural;
  const ET = p.entityTitle;
  return {
    business: b,
    businessTitle: B,
    entity: e,
    entityPlural: E,
    entityTitle: ET,
    schedule: p.schedule || "Temujanji",
    staffHint: p.staffHint,
    branchExample: p.branchExample,
    logoTitle: p.logoTitle || `Logo ${b}`,
    accountingTitle: p.accountingTitle || `Perakaunan ${b}`,
    accountingSubtitle:
      p.accountingSubtitle || `Jejaki semua wang masuk dan keluar untuk ${b}.`,
    hoursTitle: p.hoursTitle || `Waktu ${b} & cuti mingguan`,
    hoursHint:
      p.hoursHint ||
      `Tetapan setiap cawangan. Kawal Dashboard dan ${p.schedule || "Temujanji"} untuk ${b} ini. Jam terakhir = jam tutup.`,
    chargeTitle: p.chargeTitle || `Tetapan caj ${b}`,
    chargeHint: p.chargeHint || `Caj perkhidmatan setiap cawangan pada invois untuk ${b} ini.`,
    thisBranch: p.thisBranch || `${b} ini`,
    importHint:
      p.importHint ||
      `Eksport CSV atau Excel dari perisian ${b} lama, kemudian muat naik di sini ke Allvisor.`,
    importPeople: p.importPeople || ET,
    importOrder: p.importOrder || `Susunan digalakkan: ${ET}.`,
    businessSettingsHint:
      p.businessSettingsHint || `Identiti ${b} untuk invois dan LHDN.`,
    addBranchHint:
      p.addBranchHint ||
      `Masukkan nama tepat ${b} Allvisor cawangan lain (daftar ${b} itu dahulu). Jika anda admin kedua-dua, ia dipaut serta-merta. Jika tidak, admin mereka perlu lulus.`,
    addMemberHint:
      p.addMemberHint ||
      `Masukkan emel Allvisor berdaftar untuk tambah sebagai staf / supervisor / manager / co-admin. Satu akaun hanya boleh sertai satu ${b}. Owner tidak boleh dikick.`,
    lhdnSubtitle:
      p.lhdnSubtitle ||
      `Allvisor hantar e-Invois ke MyInvois sebagai intermediary. Setiap ${b} guna TIN sendiri.`,
    lhdnHowTitle: p.lhdnHowTitle || `Cara ia berfungsi untuk ${b} anda`,
    lhdnIntermediary:
      p.lhdnIntermediary ||
      `Mod intermediary: {name} hantar bagi pihak TIN setiap ${b} melalui MyInvois.`,
    inventorySubtitle: p.inventorySubtitle || `Stok dan bekalan untuk ${b} anda.`,
    inventoryPlaceholder: p.inventoryPlaceholder || "Nama item",
    deletedTitle: p.deletedTitle || `${ET} dipadam`,
    deletedHint: p.deletedHint || `Audit siapa yang padam rekod ${e}.`,
    activityTitle: p.activityTitle || `Aktiviti ${e}`,
    scorecardHint:
      p.scorecardHint ||
      `Bandingkan pendapatan, invois belum bayar dan aktiviti merentas cawangan ${b}.`,
    saveHours: p.saveHours || `Simpan waktu ${b}`,
    holidayNote:
      p.holidayNote ||
      "Cuti umum Malaysia ditonjolkan automatik pada jadual untuk staf semak.",
  };
}

const VOCAB: Record<Niche, NicheVocab> = {
  clinic: {
    niche: "clinic",
    accountingFlavor: "care",
    scorecard: "appointments",
    showRisk: true,
    showAllergies: true,
    showHours: true,
    labels: L(
      baseEn({
        business: "clinic",
        businessTitle: "Clinic",
        entity: "patient",
        entityPlural: "patients",
        entityTitle: "Patients",
        staffHint: "SV / Nurse / …",
        branchExample: "Klinik Bestari KL",
        inventoryPlaceholder: "Paracetamol 500mg",
        inventorySubtitle: "Medicines and clinic supplies.",
        activityTitle: "Patient activity",
        scorecardHint: "Compare income, unpaid invoices, appointments and no-shows across linked clinics.",
        holidayNote: "Malaysian public holidays are auto-highlighted on the timetable for nurses to check.",
        importOrder: "Recommended order: Patients → Service categories → Service items → Products → Appointments.",
      }),
      baseMs({
        business: "klinik",
        businessTitle: "Klinik",
        entity: "pesakit",
        entityPlural: "pesakit",
        entityTitle: "Pesakit",
        staffHint: "SV / Jururawat / …",
        branchExample: "Klinik Bestari KL",
        inventoryPlaceholder: "Paracetamol 500mg",
        inventorySubtitle: "Ubat dan bekalan klinik.",
        activityTitle: "Aktiviti pesakit",
        schedule: "Temujanji",
        scorecardHint: "Bandingkan pendapatan, invois belum bayar, temujanji dan no-show merentas klinik.",
        importOrder: "Susunan digalakkan: Pesakit → Kategori servis → Item servis → Produk → Temujanji.",
      })
    ),
  },
  retail: {
    niche: "retail",
    accountingFlavor: "commerce",
    scorecard: "pos",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "shop",
        businessTitle: "Shop",
        entity: "customer",
        entityPlural: "customers",
        entityTitle: "Customers",
        schedule: "Schedule",
        staffHint: "SV / Cashier / …",
        branchExample: "ProSupply JB",
        inventorySubtitle: "Products for sale and stock levels.",
        inventoryPlaceholder: "Product name",
        activityTitle: "Customer activity",
        importOrder:
          "Recommended order: Customers → Product categories → Inventory products → Suppliers → Past sales / receipts.",
        scorecardHint: "Compare income, unpaid invoices, transactions and low stock across linked shops.",
      }),
      baseMs({
        business: "kedai",
        businessTitle: "Kedai",
        entity: "pelanggan",
        entityPlural: "pelanggan",
        entityTitle: "Pelanggan",
        schedule: "Jadual",
        staffHint: "SV / Kasir / …",
        branchExample: "ProSupply JB",
        inventorySubtitle: "Produk jualan dan tahap stok.",
        activityTitle: "Aktiviti pelanggan",
        importOrder:
          "Susunan digalakkan: Pelanggan → Kategori produk → Inventori → Pembekal → Jualan lalu.",
      })
    ),
  },
  salon: {
    niche: "salon",
    accountingFlavor: "service",
    scorecard: "pos",
    showRisk: false,
    showAllergies: false,
    showHours: true,
    labels: L(
      baseEn({
        business: "salon",
        businessTitle: "Salon",
        entity: "client",
        entityPlural: "clients",
        entityTitle: "Clients",
        schedule: "Bookings",
        staffHint: "SV / Stylist / …",
        branchExample: "Glow Salon KL",
        inventorySubtitle: "Retail products and salon supplies.",
        activityTitle: "Client activity",
        importOrder: "Recommended order: Clients → Service categories → Service items → Products → Bookings.",
      }),
      baseMs({
        business: "salon",
        businessTitle: "Salon",
        entity: "klien",
        entityPlural: "klien",
        entityTitle: "Klien",
        schedule: "Tempahan",
        staffHint: "SV / Stylist / …",
        branchExample: "Glow Salon KL",
        activityTitle: "Aktiviti klien",
        importOrder: "Susunan digalakkan: Klien → Kategori servis → Item servis → Produk → Tempahan.",
      })
    ),
  },
  pharmacy: {
    niche: "pharmacy",
    accountingFlavor: "commerce",
    scorecard: "pos",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "pharmacy",
        businessTitle: "Pharmacy",
        entity: "customer",
        entityPlural: "customers",
        entityTitle: "Customers",
        staffHint: "SV / Pharmacist / …",
        branchExample: "Farmasi Bestari KL",
        inventoryPlaceholder: "Panadol 500mg",
        inventorySubtitle: "Medicines, batches and pharmacy stock.",
        activityTitle: "Customer activity",
        importOrder:
          "Recommended order: Customers → Product categories → Products → Suppliers → Past sales.",
      }),
      baseMs({
        business: "farmasi",
        businessTitle: "Farmasi",
        entity: "pelanggan",
        entityPlural: "pelanggan",
        entityTitle: "Pelanggan",
        staffHint: "SV / Ahli farmasi / …",
        branchExample: "Farmasi Bestari KL",
        inventoryPlaceholder: "Panadol 500mg",
        activityTitle: "Aktiviti pelanggan",
      })
    ),
  },
  optical: {
    niche: "optical",
    accountingFlavor: "service",
    scorecard: "pos",
    showRisk: false,
    showAllergies: false,
    showHours: true,
    labels: L(
      baseEn({
        business: "optical shop",
        businessTitle: "Optical",
        entity: "customer",
        entityPlural: "customers",
        entityTitle: "Customers",
        schedule: "Eye exams",
        staffHint: "SV / Optometrist / …",
        branchExample: "Vision Care KL",
        inventorySubtitle: "Frames, lenses and optical accessories.",
        activityTitle: "Customer activity",
        importOrder: "Recommended order: Customers → Products → Eye exam bookings.",
      }),
      baseMs({
        business: "kedai optik",
        businessTitle: "Optik",
        entity: "pelanggan",
        entityPlural: "pelanggan",
        entityTitle: "Pelanggan",
        schedule: "Pemeriksaan mata",
        staffHint: "SV / Optometris / …",
        branchExample: "Vision Care KL",
        activityTitle: "Aktiviti pelanggan",
      })
    ),
  },
  tuition: {
    niche: "tuition",
    accountingFlavor: "service",
    scorecard: "generic",
    showRisk: false,
    showAllergies: false,
    showHours: true,
    labels: L(
      baseEn({
        business: "tuition centre",
        businessTitle: "Tuition",
        entity: "student",
        entityPlural: "students",
        entityTitle: "Students",
        schedule: "Schedule",
        staffHint: "SV / Guru / Tutor / …",
        branchExample: "Tuition Bestari KL",
        inventorySubtitle: "Materials and supplies for the tuition centre.",
        activityTitle: "Student activity",
        importOrder: "Recommended order: Students.",
        scorecardHint: "Compare income, unpaid invoices and activity across linked tuition centres.",
      }),
      baseMs({
        business: "pusat tuisyen",
        businessTitle: "Tuisyen",
        entity: "pelajar",
        entityPlural: "pelajar",
        entityTitle: "Pelajar",
        schedule: "Schedule",
        staffHint: "SV / Guru / Tutor / …",
        branchExample: "Tuition Bestari KL",
        activityTitle: "Aktiviti pelajar",
        importOrder: "Susunan digalakkan: Pelajar.",
      })
    ),
  },
  workshop: {
    niche: "workshop",
    accountingFlavor: "service",
    scorecard: "pos",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "workshop",
        businessTitle: "Workshop",
        entity: "customer",
        entityPlural: "customers",
        entityTitle: "Customers",
        schedule: "Jobs",
        staffHint: "SV / Mechanic / …",
        branchExample: "AutoFix KL",
        inventorySubtitle: "Parts and workshop consumables.",
        inventoryPlaceholder: "Engine oil 4L",
        activityTitle: "Customer activity",
      }),
      baseMs({
        business: "bengkel",
        businessTitle: "Bengkel",
        entity: "pelanggan",
        entityPlural: "pelanggan",
        entityTitle: "Pelanggan",
        schedule: "Kerja",
        staffHint: "SV / Mekanik / …",
        branchExample: "AutoFix KL",
        inventoryPlaceholder: "Minyak enjin 4L",
        activityTitle: "Aktiviti pelanggan",
      })
    ),
  },
  gym: {
    niche: "gym",
    accountingFlavor: "service",
    scorecard: "generic",
    showRisk: false,
    showAllergies: false,
    showHours: true,
    labels: L(
      baseEn({
        business: "gym",
        businessTitle: "Gym",
        entity: "member",
        entityPlural: "members",
        entityTitle: "Members",
        schedule: "Classes",
        staffHint: "SV / Coach / …",
        branchExample: "FitZone KL",
        inventorySubtitle: "Retail and gym supplies.",
        activityTitle: "Member activity",
        importOrder: "Recommended order: Members.",
      }),
      baseMs({
        business: "gim",
        businessTitle: "Gim",
        entity: "ahli",
        entityPlural: "ahli",
        entityTitle: "Ahli",
        schedule: "Kelas",
        staffHint: "SV / Coach / …",
        branchExample: "FitZone KL",
        activityTitle: "Aktiviti ahli",
        importOrder: "Susunan digalakkan: Ahli.",
      })
    ),
  },
  vet: {
    niche: "vet",
    accountingFlavor: "care",
    scorecard: "appointments",
    showRisk: false,
    showAllergies: true,
    showHours: true,
    labels: L(
      baseEn({
        business: "vet clinic",
        businessTitle: "Veterinary",
        entity: "pet owner",
        entityPlural: "pet owners",
        entityTitle: "Pet owners",
        schedule: "Appointments",
        staffHint: "SV / Vet nurse / …",
        branchExample: "Happy Paws Vet",
        inventoryPlaceholder: "Dog food 3kg",
        inventorySubtitle: "Pet medicines, food and supplies.",
        activityTitle: "Pet owner activity",
        importOrder: "Recommended order: Pet owners → Service categories → Appointments.",
      }),
      baseMs({
        business: "klinik haiwan",
        businessTitle: "Veterinar",
        entity: "pemilik haiwan",
        entityPlural: "pemilik haiwan",
        entityTitle: "Pemilik haiwan",
        schedule: "Temujanji",
        staffHint: "SV / Jururawat vet / …",
        branchExample: "Happy Paws Vet",
        inventoryPlaceholder: "Makanan anjing 3kg",
        activityTitle: "Aktiviti pemilik haiwan",
      })
    ),
  },
  fashion: {
    niche: "fashion",
    accountingFlavor: "commerce",
    scorecard: "pos",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "fashion shop",
        businessTitle: "Fashion",
        entity: "customer",
        entityPlural: "customers",
        entityTitle: "Customers",
        staffHint: "SV / Sales / …",
        branchExample: "Style Hub KL",
        inventorySubtitle: "Apparel, variants and accessories.",
        inventoryPlaceholder: "Tee Basic",
        activityTitle: "Customer activity",
      }),
      baseMs({
        business: "kedai fesyen",
        businessTitle: "Fesyen",
        entity: "pelanggan",
        entityPlural: "pelanggan",
        entityTitle: "Pelanggan",
        staffHint: "SV / Jualan / …",
        branchExample: "Style Hub KL",
        activityTitle: "Aktiviti pelanggan",
      })
    ),
  },
  electronics: {
    niche: "electronics",
    accountingFlavor: "commerce",
    scorecard: "pos",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "electronics shop",
        businessTitle: "Electronics",
        entity: "customer",
        entityPlural: "customers",
        entityTitle: "Customers",
        staffHint: "SV / Tech / …",
        branchExample: "Gadget Mart KL",
        inventoryPlaceholder: "Phone X128",
        inventorySubtitle: "Devices, serials and accessories.",
        activityTitle: "Customer activity",
      }),
      baseMs({
        business: "kedai elektronik",
        businessTitle: "Elektronik",
        entity: "pelanggan",
        entityPlural: "pelanggan",
        entityTitle: "Pelanggan",
        staffHint: "SV / Tech / …",
        branchExample: "Gadget Mart KL",
        activityTitle: "Aktiviti pelanggan",
      })
    ),
  },
  wholesale: {
    niche: "wholesale",
    accountingFlavor: "commerce",
    scorecard: "pos",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "wholesale",
        businessTitle: "Wholesale",
        entity: "buyer",
        entityPlural: "buyers",
        entityTitle: "Buyers",
        staffHint: "SV / Sales / …",
        branchExample: "BulkTrade Shah Alam",
        inventorySubtitle: "Bulk stock and price tiers.",
        activityTitle: "Buyer activity",
      }),
      baseMs({
        business: "borong",
        businessTitle: "Borong",
        entity: "pembeli",
        entityPlural: "pembeli",
        entityTitle: "Pembeli",
        staffHint: "SV / Jualan / …",
        branchExample: "BulkTrade Shah Alam",
        activityTitle: "Aktiviti pembeli",
      })
    ),
  },
  laundry: {
    niche: "laundry",
    accountingFlavor: "commerce",
    scorecard: "pos",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "laundry",
        businessTitle: "Laundry",
        entity: "customer",
        entityPlural: "customers",
        entityTitle: "Customers",
        staffHint: "SV / Attendant / …",
        branchExample: "FreshWash KL",
        inventorySubtitle: "Detergent and laundry supplies.",
        activityTitle: "Customer activity",
      }),
      baseMs({
        business: "dobi",
        businessTitle: "Dobi",
        entity: "pelanggan",
        entityPlural: "pelanggan",
        entityTitle: "Pelanggan",
        staffHint: "SV / Operator / …",
        branchExample: "FreshWash KL",
        activityTitle: "Aktiviti pelanggan",
      })
    ),
  },
  physio: {
    niche: "physio",
    accountingFlavor: "care",
    scorecard: "appointments",
    showRisk: true,
    showAllergies: true,
    showHours: true,
    labels: L(
      baseEn({
        business: "physio centre",
        businessTitle: "Physio",
        entity: "patient",
        entityPlural: "patients",
        entityTitle: "Patients",
        schedule: "Sessions",
        staffHint: "SV / Therapist / …",
        branchExample: "MoveWell Physio",
        inventoryPlaceholder: "Knee support",
        inventorySubtitle: "Therapy aids and supports.",
        activityTitle: "Patient activity",
        importOrder: "Recommended order: Patients → Services → Sessions.",
      }),
      baseMs({
        business: "pusat fisio",
        businessTitle: "Fisio",
        entity: "pesakit",
        entityPlural: "pesakit",
        entityTitle: "Pesakit",
        schedule: "Sesi",
        staffHint: "SV / Terapis / …",
        branchExample: "MoveWell Physio",
        activityTitle: "Aktiviti pesakit",
      })
    ),
  },
  lab: {
    niche: "lab",
    accountingFlavor: "care",
    scorecard: "appointments",
    showRisk: false,
    showAllergies: false,
    showHours: true,
    labels: L(
      baseEn({
        business: "lab",
        businessTitle: "Lab",
        entity: "patient",
        entityPlural: "patients",
        entityTitle: "Patients",
        schedule: "Appointments",
        staffHint: "SV / Lab tech / …",
        branchExample: "MedLab KL",
        inventorySubtitle: "Lab consumables and kits.",
        activityTitle: "Patient activity",
      }),
      baseMs({
        business: "makmal",
        businessTitle: "Makmal",
        entity: "pesakit",
        entityPlural: "pesakit",
        entityTitle: "Pesakit",
        schedule: "Temujanji",
        staffHint: "SV / Jurutech / …",
        branchExample: "MedLab KL",
        activityTitle: "Aktiviti pesakit",
      })
    ),
  },
  fnb: {
    niche: "fnb",
    accountingFlavor: "commerce",
    scorecard: "pos",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "restaurant",
        businessTitle: "F&B",
        entity: "guest",
        entityPlural: "guests",
        entityTitle: "Guests",
        staffHint: "SV / Waiter / …",
        branchExample: "Nasi Lemak House",
        inventorySubtitle: "Menu items and kitchen stock.",
        inventoryPlaceholder: "Nasi Lemak",
        activityTitle: "Guest activity",
      }),
      baseMs({
        business: "restoran",
        businessTitle: "F&B",
        entity: "tetamu",
        entityPlural: "tetamu",
        entityTitle: "Tetamu",
        staffHint: "SV / Pelayan / …",
        branchExample: "Nasi Lemak House",
        inventoryPlaceholder: "Nasi Lemak",
        activityTitle: "Aktiviti tetamu",
      })
    ),
  },
  hotel: {
    niche: "hotel",
    accountingFlavor: "hospitality",
    scorecard: "generic",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "hotel",
        businessTitle: "Hotel",
        entity: "guest",
        entityPlural: "guests",
        entityTitle: "Guests",
        schedule: "Bookings",
        staffHint: "SV / Front desk / …",
        branchExample: "Hotel Bestari KL",
        inventorySubtitle: "Hotel supplies and amenities.",
        activityTitle: "Guest activity",
        importOrder: "Recommended order: Guests.",
      }),
      baseMs({
        business: "hotel",
        businessTitle: "Hotel",
        entity: "tetamu",
        entityPlural: "tetamu",
        entityTitle: "Tetamu",
        schedule: "Tempahan",
        staffHint: "SV / Front desk / …",
        branchExample: "Hotel Bestari KL",
        activityTitle: "Aktiviti tetamu",
      })
    ),
  },
  property: {
    niche: "property",
    accountingFlavor: "specialty",
    scorecard: "generic",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "agency",
        businessTitle: "Property",
        entity: "client",
        entityPlural: "clients",
        entityTitle: "Clients",
        staffHint: "SV / Agent / …",
        branchExample: "HomeFind Realty",
        activityTitle: "Client activity",
        importOrder: "Recommended order: Clients.",
      }),
      baseMs({
        business: "agensi",
        businessTitle: "Hartanah",
        entity: "klien",
        entityPlural: "klien",
        entityTitle: "Klien",
        staffHint: "SV / Ejen / …",
        branchExample: "HomeFind Realty",
        activityTitle: "Aktiviti klien",
      })
    ),
  },
  courier: {
    niche: "courier",
    accountingFlavor: "specialty",
    scorecard: "generic",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "courier",
        businessTitle: "Courier",
        entity: "customer",
        entityPlural: "customers",
        entityTitle: "Customers",
        staffHint: "SV / Dispatcher / …",
        branchExample: "SwiftSend KL",
        activityTitle: "Customer activity",
      }),
      baseMs({
        business: "kurier",
        businessTitle: "Kurier",
        entity: "pelanggan",
        entityPlural: "pelanggan",
        entityTitle: "Pelanggan",
        staffHint: "SV / Dispatcher / …",
        branchExample: "SwiftSend KL",
        activityTitle: "Aktiviti pelanggan",
      })
    ),
  },
  contractor: {
    niche: "contractor",
    accountingFlavor: "specialty",
    scorecard: "generic",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "company",
        businessTitle: "Contractor",
        entity: "client",
        entityPlural: "clients",
        entityTitle: "Clients",
        staffHint: "SV / Site supervisor / …",
        branchExample: "BuildRight Sdn Bhd",
        activityTitle: "Client activity",
      }),
      baseMs({
        business: "syarikat",
        businessTitle: "Kontraktor",
        entity: "klien",
        entityPlural: "klien",
        entityTitle: "Klien",
        staffHint: "SV / Penyelia tapak / …",
        branchExample: "BuildRight Sdn Bhd",
        activityTitle: "Aktiviti klien",
      })
    ),
  },
  manufacturing: {
    niche: "manufacturing",
    accountingFlavor: "specialty",
    scorecard: "generic",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "factory",
        businessTitle: "Manufacturing",
        entity: "customer",
        entityPlural: "customers",
        entityTitle: "Customers",
        staffHint: "SV / Supervisor / …",
        branchExample: "Precision Mfg KL",
        inventorySubtitle: "Raw materials and finished goods.",
        inventoryPlaceholder: "Steel sheet A",
        activityTitle: "Customer activity",
      }),
      baseMs({
        business: "kilang",
        businessTitle: "Pembuatan",
        entity: "pelanggan",
        entityPlural: "pelanggan",
        entityTitle: "Pelanggan",
        staffHint: "SV / Penyelia / …",
        branchExample: "Precision Mfg KL",
        activityTitle: "Aktiviti pelanggan",
      })
    ),
  },
  legal: {
    niche: "legal",
    accountingFlavor: "specialty",
    scorecard: "generic",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "firm",
        businessTitle: "Legal",
        entity: "client",
        entityPlural: "clients",
        entityTitle: "Clients",
        staffHint: "SV / Paralegal / …",
        branchExample: "Lee & Partners",
        activityTitle: "Client activity",
        importOrder: "Recommended order: Clients.",
      }),
      baseMs({
        business: "firma",
        businessTitle: "Guaman",
        entity: "klien",
        entityPlural: "klien",
        entityTitle: "Klien",
        staffHint: "SV / Paralegal / …",
        branchExample: "Lee & Partners",
        activityTitle: "Aktiviti klien",
      })
    ),
  },
  events: {
    niche: "events",
    accountingFlavor: "specialty",
    scorecard: "generic",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "events company",
        businessTitle: "Events",
        entity: "client",
        entityPlural: "clients",
        entityTitle: "Clients",
        staffHint: "SV / Coordinator / …",
        branchExample: "Celebrate Events",
        activityTitle: "Client activity",
      }),
      baseMs({
        business: "syarikat event",
        businessTitle: "Event",
        entity: "klien",
        entityPlural: "klien",
        entityTitle: "Klien",
        staffHint: "SV / Koordinator / …",
        branchExample: "Celebrate Events",
        activityTitle: "Aktiviti klien",
      })
    ),
  },
  farm: {
    niche: "farm",
    accountingFlavor: "specialty",
    scorecard: "generic",
    showRisk: false,
    showAllergies: false,
    showHours: false,
    labels: L(
      baseEn({
        business: "farm",
        businessTitle: "Farm",
        entity: "buyer",
        entityPlural: "buyers",
        entityTitle: "Buyers",
        staffHint: "SV / Farm hand / …",
        branchExample: "GreenField Farm",
        inventorySubtitle: "Produce, inputs and tools.",
        inventoryPlaceholder: "Fertilizer 25kg",
        activityTitle: "Buyer activity",
      }),
      baseMs({
        business: "ladang",
        businessTitle: "Ladang",
        entity: "pembeli",
        entityPlural: "pembeli",
        entityTitle: "Pembeli",
        staffHint: "SV / Pekerja ladang / …",
        branchExample: "GreenField Farm",
        activityTitle: "Aktiviti pembeli",
      })
    ),
  },
};

export function getNicheVocab(niche: Niche | string | null | undefined): NicheVocab {
  if (niche && niche in VOCAB) return VOCAB[niche as Niche];
  return VOCAB.retail;
}

export function vocabLabels(
  niche: Niche | string | null | undefined,
  locale: string | null | undefined
): NicheVocabLabels {
  const v = getNicheVocab(niche);
  return locale?.startsWith("ms") ? v.labels.ms : v.labels.en;
}

/** Accounting category sets by flavor — not clinic-vs-shop. */
export function accountingCategories(flavor: AccountingFlavor): {
  income: string[];
  expense: string[];
} {
  switch (flavor) {
    case "care":
      return {
        income: ["Consultation", "Procedure", "Medicine / supplies sales", "Other income"],
        expense: [
          "Rent",
          "Utilities",
          "Medicine / Supplies",
          "Staff salary",
          "Equipment",
          "Lab / Outsource",
          "Marketing",
          "Other",
        ],
      };
    case "commerce":
      return {
        income: ["POS sales", "Wholesale / bulk", "Other income"],
        expense: [
          "Rent",
          "Utilities",
          "Cost of goods (COGS)",
          "Staff wages",
          "Marketing",
          "Logistics / Delivery",
          "Equipment",
          "Other",
        ],
      };
    case "service":
      return {
        income: ["Service fees", "Product / retail sales", "Packages / memberships", "Other income"],
        expense: [
          "Rent",
          "Utilities",
          "Staff wages",
          "Supplies",
          "Marketing",
          "Equipment",
          "Other",
        ],
      };
    case "hospitality":
      return {
        income: ["Room revenue", "F&B", "Other income"],
        expense: ["Rent / lease", "Utilities", "Staff wages", "Housekeeping", "Marketing", "Other"],
      };
    case "specialty":
    default:
      return {
        income: ["Project / service fees", "Sales", "Other income"],
        expense: ["Rent", "Utilities", "Staff wages", "Materials", "Marketing", "Equipment", "Other"],
      };
  }
}
