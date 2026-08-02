"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { updateOrgSettingsAction } from "@/app/actions";
import {
  formatInvoiceNumber,
  normalizeInvoicePattern,
  normalizeInvoicePrefix,
  normalizeSeqDigits,
} from "@/lib/invoice-number";

export function InvoiceFormatForm({
  orgName,
  initial,
  labels,
}: {
  orgName: string;
  initial: {
    prefix: string;
    nextSeq: number;
    seqDigits: number;
    pattern: string;
  };
  labels: {
    title: string;
    hint: string;
    prefix: string;
    nextSeq: string;
    seqDigits: string;
    pattern: string;
    patternHelp: string;
    preview: string;
    save: string;
  };
}) {
  const [prefix, setPrefix] = useState(initial.prefix);
  const [nextSeq, setNextSeq] = useState(String(initial.nextSeq));
  const [seqDigits, setSeqDigits] = useState(String(initial.seqDigits));
  const [pattern, setPattern] = useState(initial.pattern);

  const preview = useMemo(() => {
    return formatInvoiceNumber(
      {
        invoice_prefix: normalizeInvoicePrefix(prefix),
        invoice_next_seq: Math.max(1, Math.floor(Number(nextSeq) || 1)),
        invoice_seq_digits: normalizeSeqDigits(seqDigits),
        invoice_number_pattern: normalizeInvoicePattern(pattern),
      },
      Math.max(1, Math.floor(Number(nextSeq) || 1))
    );
  }, [prefix, nextSeq, seqDigits, pattern]);

  return (
    <div className="surface" style={{ padding: "1.25rem" }}>
      <h3 style={{ marginTop: 0 }}>{labels.title}</h3>
      <p className="muted">{labels.hint}</p>
      <ActionForm action={updateOrgSettingsAction} className="stack">
        <input type="hidden" name="name" value={orgName} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <div className="field">
            <label>{labels.prefix}</label>
            <input
              name="invoice_prefix"
              className="input"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="INV"
            />
          </div>
          <div className="field">
            <label>{labels.nextSeq}</label>
            <input
              name="invoice_next_seq"
              type="number"
              min={1}
              className="input"
              value={nextSeq}
              onChange={(e) => setNextSeq(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{labels.seqDigits}</label>
            <input
              name="invoice_seq_digits"
              type="number"
              min={1}
              max={8}
              className="input"
              value={seqDigits}
              onChange={(e) => setSeqDigits(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>{labels.pattern}</label>
          <input
            name="invoice_number_pattern"
            className="input"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="{PREFIX}-{YYYY}-{SEQ}"
          />
          <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
            {labels.patternHelp}
          </p>
        </div>
        <p style={{ margin: 0, fontSize: "0.95rem" }}>
          {labels.preview}: <code>{preview}</code>
        </p>
        <button type="submit" className="btn btn-soft">
          {labels.save}
        </button>
      </ActionForm>
    </div>
  );
}
