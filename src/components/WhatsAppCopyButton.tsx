"use client";

import { useState } from "react";
import { whatsappHref } from "@/lib/whatsapp";

export function WhatsAppCopyButton({
  phone,
  message,
  label = "WhatsApp",
  className = "btn btn-soft",
}: {
  phone?: string | null;
  message: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyOnly() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      <a
        className={className}
        href={whatsappHref(phone, message)}
        target="_blank"
        rel="noreferrer"
        style={{ textDecoration: "none" }}
      >
        {label}
      </a>
      <button type="button" className="btn btn-ghost" onClick={copyOnly}>
        {copied ? "Copied" : "Copy text"}
      </button>
    </div>
  );
}
