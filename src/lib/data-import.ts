/** Data migration / import helpers for CSV & Excel uploads. */

export type ImportKind =
  | "patients"
  | "products"
  | "product_categories"
  | "suppliers"
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
    category: ["category", "category_name", "kategori"],
    sold_by: ["sold_by", "unit", "uom", "dijual_ikut"],
    unit_price: ["unit_price", "price", "selling_price", "harga", "harga_jual"],
    cost_price: ["cost_price", "cost", "harga_kos", "kos"],
    quantity: ["quantity", "qty", "stock", "kuantiti", "stok"],
    low_stock_threshold: ["low_stock_threshold", "low_stock", "reorder", "ambang"],
    available_to_sale: ["available_to_sale", "for_sale", "available", "dijual"],
    track_stock: ["track_stock", "track", "jejaki_stok"],
    price_on_sale: ["price_on_sale", "open_price", "set_on_sale"],
    description: ["description", "desc", "keterangan"],
  },
  product_categories: {
    name: ["name", "category", "category_name", "nama", "nama_kategori"],
    parent: ["parent", "parent_name", "parent_category", "induk"],
  },
  suppliers: {
    name: ["name", "supplier", "supplier_name", "nama", "nama_pembekal"],
    phone: ["phone", "tel", "mobile", "telefon"],
    email: ["email", "e_mail", "emel"],
    address: ["address", "alamat"],
    notes: ["notes", "note", "remark", "catatan"],
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

function yn(v: string | undefined, fallback = true) {
  if (v == null || v === "") return fallback;
  const s = String(v).trim().toLowerCase();
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  return fallback;
}

export function parseBoolFlag(v: string | undefined, fallback = true) {
  return yn(v, fallback);
}

export const IMPORT_TEMPLATES: Record<
  ImportKind,
  { headers: string[]; sample: string[][]; filename: string }
> = {
  patients: {
    filename: "allvisor-customers-template.csv",
    headers: ["name", "ic_number", "phone", "email", "address", "notes", "risk_level"],
    sample: [
      ["Ahmad bin Ali", "900101145678", "0123456789", "ahmad@email.com", "12 Jalan Melati, Kajang", "Regular", "low"],
      ["Siti Aminah", "880202085432", "0198765432", "", "45 Taman Sri Putra, Puchong", "", "medium"],
    ],
  },
  product_categories: {
    filename: "allvisor-product-categories-template.csv",
    headers: ["name", "parent"],
    sample: [
      ["Beverages", ""],
      ["Water", "Beverages"],
      ["Snacks", ""],
    ],
  },
  products: {
    filename: "allvisor-products-template.csv",
    headers: [
      "name",
      "sku",
      "barcode",
      "category",
      "sold_by",
      "unit_price",
      "cost_price",
      "quantity",
      "low_stock_threshold",
      "available_to_sale",
      "track_stock",
      "price_on_sale",
      "description",
    ],
    sample: [
      [
        "Tali Nylon 5m",
        "SKU-TALI",
        "8717",
        "Hardware",
        "each",
        "8.50",
        "3.20",
        "120",
        "15",
        "yes",
        "yes",
        "no",
        "Demo barcode 8717",
      ],
      [
        "Custom cable",
        "SKU-CUSTOM",
        "999000111",
        "Electronics",
        "meter",
        "0",
        "0",
        "50",
        "5",
        "yes",
        "yes",
        "yes",
        "Price set on sale",
      ],
    ],
  },
  suppliers: {
    filename: "allvisor-suppliers-template.csv",
    headers: ["name", "phone", "email", "address", "notes"],
    sample: [
      ["Syarikat Sumber Jaya", "0388881111", "sales@sumberjaya.my", "Shah Alam", "Main grocery supplier"],
      ["Tech Parts Sdn Bhd", "0377772222", "order@techparts.my", "Petaling Jaya", "Electronics"],
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
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  const n = Number(s);
  if (Number.isFinite(n) && n > 20000 && n < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + n * 86400000;
    return new Date(ms).toISOString();
  }
  return null;
}

/** Clinic: full set. Retail order uses product_categories + suppliers. */
export const IMPORT_KIND_ORDER: ImportKind[] = [
  "patients",
  "product_categories",
  "products",
  "suppliers",
  "service_categories",
  "service_items",
  "appointments",
];

export const RETAIL_IMPORT_KINDS: ImportKind[] = [
  "patients",
  "product_categories",
  "products",
  "suppliers",
];
