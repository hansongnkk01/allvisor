export type InvoiceNumberSettings = {
  invoice_prefix?: string | null;
  invoice_next_seq?: number | null;
  invoice_seq_digits?: number | null;
  invoice_number_pattern?: string | null;
};

const DEFAULT_PATTERN = "{PREFIX}-{YYYY}-{SEQ}";

export function normalizeInvoicePrefix(raw: string | null | undefined) {
  return String(raw || "INV").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 12) || "INV";
}

export function normalizeSeqDigits(raw: number | string | null | undefined) {
  const n = Math.floor(Number(raw) || 5);
  return Math.min(8, Math.max(1, n));
}

export function normalizeInvoicePattern(raw: string | null | undefined) {
  const pattern = String(raw || DEFAULT_PATTERN).trim().slice(0, 80);
  if (!/\{SEQ\}/i.test(pattern)) return DEFAULT_PATTERN;
  // Allow letters, digits, separators, and known tokens only.
  if (!/^[\w\-./{ }]+$/i.test(pattern)) return DEFAULT_PATTERN;
  return pattern || DEFAULT_PATTERN;
}

/** Build auto invoice number from org settings + sequence. */
export function formatInvoiceNumber(
  settings: InvoiceNumberSettings | null | undefined,
  seq: number,
  at: Date = new Date()
) {
  const prefix = normalizeInvoicePrefix(settings?.invoice_prefix);
  const digits = normalizeSeqDigits(settings?.invoice_seq_digits);
  const pattern = normalizeInvoicePattern(settings?.invoice_number_pattern);
  const y = at.getFullYear();
  const yy = String(y).slice(-2);
  const mm = String(at.getMonth() + 1).padStart(2, "0");
  const dd = String(at.getDate()).padStart(2, "0");
  const seqStr = String(Math.max(1, Math.floor(seq))).padStart(digits, "0");

  return pattern
    .replace(/\{PREFIX\}/gi, prefix)
    .replace(/\{YYYY\}/gi, String(y))
    .replace(/\{YY\}/gi, yy)
    .replace(/\{MM\}/gi, mm)
    .replace(/\{DD\}/gi, dd)
    .replace(/\{SEQ\}/gi, seqStr)
    .replace(/\s+/g, "")
    .slice(0, 64);
}

export function nextInvoiceSeq(
  settings: InvoiceNumberSettings | null | undefined,
  existingCount: number
) {
  const start = Math.max(1, Math.floor(Number(settings?.invoice_next_seq) || 1));
  return Math.max(start, (existingCount || 0) + 1);
}

export function previewInvoiceNumber(
  settings: InvoiceNumberSettings | null | undefined,
  at: Date = new Date()
) {
  const seq = Math.max(1, Math.floor(Number(settings?.invoice_next_seq) || 1));
  return formatInvoiceNumber(settings, seq, at);
}
