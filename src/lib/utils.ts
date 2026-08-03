import { clsx, type ClassValue } from "clsx";
import { formatInvoiceNumber } from "./invoice-number";
import { getNicheDef } from "./niche-capabilities";
import type { Niche } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, locale = "ms-MY") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string | Date, locale = "ms-MY") {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date, locale = "ms-MY") {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Map niche → CSS theme token (clinic teal vs retail amber). */
export function nicheAccent(niche: Niche): "clinic" | "retail" {
  const engine = getNicheDef(niche).engine;
  if (engine === "care" || engine === "hospitality") return "clinic";
  return "retail";
}

/** Prefer for data-niche attribute — keeps existing CSS themes. */
export function nicheThemeAttr(niche: Niche | string | null | undefined): "clinic" | "retail" {
  if (!niche) return "clinic";
  return nicheAccent(niche as Niche);
}

export function generateInvoiceNumber(seq: number) {
  return formatInvoiceNumber(null, seq);
}
