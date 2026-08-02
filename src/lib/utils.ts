import { clsx, type ClassValue } from "clsx";
import { formatInvoiceNumber } from "./invoice-number";
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

export function nicheAccent(niche: Niche) {
  return niche === "clinic" ? "clinic" : "retail";
}

export function generateInvoiceNumber(seq: number) {
  return formatInvoiceNumber(null, seq);
}
