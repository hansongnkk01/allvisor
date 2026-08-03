/** Data migration / import helpers for CSV & Excel uploads. */

export type ImportKind =
  | "patients"
  | "products"
  | "service_categories"
  | "service_items"
  | "appointments";

export type ImportRow = Record<string, string>;

export type ImportResult = {
  inserted: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

const ALIASES: Record<ImportKind, Record<string, string[]>> = {
  patients: {
    name: ["name", "patient_name", "customer_name", "full_name", "nama", "nama_pesakit"],
    ic_number: ["ic_number", "ic", "nric", "mykad", "no_ic", "ic_no"],
    phone: ["phone", "tel", "mobile", "hp", "telefon", "no_telefon"],
    email: ["email", "e_mail", "emel"],
    address: ["address", "alamat", "home_address", "addr"],
    notes: ["notes", "note", "remark", "remarks", "catatan"],
    risk_level: ["risk_level", "risk", "risiko"],
  },
  products: {
    name: ["name", "product_name", "item_name", "medicine", "nama", "nama_item"],
    sku: ["sku", "code", "item_code", "kod"],
    barcode: ["barcode", "ean", "upc", "scan_code", "kod_bar"],
    unit_price: ["unit_price", "price", "selling_price", "harga", "harga_jual"],
    cost_price: ["cost_price", "cost", "harga_kos", "kos"],
    quantity: ["quantity", "qty", "stock", "kuantiti", "stok"],
    low_stock_threshold: ["low_stock_threshold", "low_stock", "reorder", "ambang"],
    description: ["description", "desc", "keterangan"],
  },
  service_categories: {
    name: ["name", "category", "category_name", "nama", "nama_kategori"],
    description: ["description", "desc", "keterangan", "notes"],
  },
  service_items: {
    name: ["name", "service_name", "item_name", "nama", "nama_servis"],
    category: ["category", "category_name", "kategori", "service_category"],
    unit_price: ["unit_price", "price", "harga"],
    description: ["description", "desc", "keterangan"],
  },
  appointments: {
    patient_name: ["patient_name", "customer_name", "name", "nama_pesakit", "nama"],
    patient_ic: ["patient_ic", "ic_number", "ic", "nric", "no_ic"],
    patient_phone: ["patient_phone", "phone", "tel", "telefon"],
    category: ["category", "service", "title", "kategori", "servis"],
    starts_at: ["starts_at", "start", "start_time", "appointment_start", "mula", "tarikh_mula"],
    ends_at: ["ends_at", "end", "end_time", "appointment_end", "tamat", "tarikh_tamat"],
    status: ["status", "status_temujanji"],
    notes: ["notes", "note", "remark", "catatan"],
  },
};

export const IMPORT_TEMPLATES: Record<
  ImportKind,
  { headers: string[]; sample: string[][]; filename: string }
> = {
  patients: {
    filename: "allvisor-patients-template.csv",
    headers: ["name", "ic_number", "phone", "email", "address", "notes", "risk_level"],
    sample: [
      [
        "Ahmad bin Ali",
        "900101145678",
        "0123456789",
        "ahmad@email.com",
        "12 Jalan Melati, Kajang",
        "Regular patient",
        "low",
      ],
      [
        "Siti Aminah",
        "880202085432",
        "0198765432",
        "",
        "45 Taman Sri Putra, Puchong",
        "Allergy: penicillin",
        "medium",
      ],
    ],
  },
  products: {
    filename: "allvisor-products-template.csv",
    headers: [
      "name",
      "sku",
      "barcode",
      "unit_price",
      "cost_price",
      "quantity",
      "low_stock_threshold",
      "description",
    ],
    sample: [
      ["Paracetamol 500mg", "MED-001", "9551234567890", "5.00", "2.50", "100", "20", "Tablet"],
      ["Surgical gloves M", "SUP-010", "9559876543210", "12.00", "6.00", "50", "10", "Box of 100"],
    ],
  },
  service_categories: {
    filename: "allvisor-service-categories-template.csv",
    headers: ["name", "description"],
    sample: [
      ["General consultation", "Standard GP visit"],
      ["Follow-up", "Review appointment"],
    ],
  },
  service_items: {
    filename: "allvisor-service-items-template.csv",
    headers: ["name", "category", "unit_price", "description"],
    sample: [
      ["Consultation fee", "General consultation", "50.00", ""],
      ["Wound dressing", "Follow-up", "30.00", ""],
    ],
  },
  appointments: {
    filename: "allvisor-appointments-template.csv",
    headers: [
      "patient_name",
      "patient_ic",
      "patient_phone",
      "category",
      "starts_at",
      "ends_at",
      "status",
      "notes",
    ],
    sample: [
      [
        "Ahmad bin Ali",
        "900101145678",
        "0123456789",
        "General consultation",
        "2026-08-01 09:00",
        "2026-08-01 09:30",
        "scheduled",
        "",
      ],
    ],
  },
};

export function normalizeHeader(h: string) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^\w]/g, "");
}

export function mapRow(kind: ImportKind, raw: Record<string, unknown>): ImportRow {
  const out: ImportRow = {};
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v == null) continue;
    normalized[normalizeHeader(k)] = String(v).trim();
  }
  for (const [field, aliases] of Object.entries(ALIASES[kind])) {
    for (const alias of aliases) {
      const val = normalized[alias];
      if (val !== undefined && val !== "") {
        out[field] = val;
        break;
      }
    }
  }
  return out;
}

export function rowsToCsv(headers: string[], rows: string[][]) {
  const esc = (v: string) => {
    if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function downloadTemplate(kind: ImportKind) {
  const t = IMPORT_TEMPLATES[kind];
  const csv = rowsToCsv(t.headers, t.sample);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = t.filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toNumber(v: string | undefined, fallback = 0) {
  if (v == null || v === "") return fallback;
  const n = Number(String(v).replace(/,/g, "").replace(/RM\s*/i, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function parseDateTime(v: string | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  // Already ISO-ish
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  // Excel serial sometimes comes as number string
  const n = Number(s);
  if (Number.isFinite(n) && n > 20000 && n < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + n * 86400000;
    return new Date(ms).toISOString();
  }
  return null;
}

export const IMPORT_KIND_ORDER: ImportKind[] = [
  "patients",
  "service_categories",
  "service_items",
  "products",
  "appointments",
];
