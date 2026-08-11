"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import type { PipelineStatus } from "@/lib/status-pipelines";
import { WhatsAppCopyButton } from "@/components/WhatsAppCopyButton";

export type PipelineCard = {
  id: string;
  title: string;
  status: string;
  subtitle?: string;
  meta?: string;
  amountLabel?: string;
  phone?: string | null;
  whatsappMessage?: string;
  invoiceId?: string | null;
  tone?: "alert" | "good" | "muted";
};

export function StatusPipelineBoard({
  statuses,
  items,
  updateAction,
  invoiceAction,
  emptyLabel = "No items in this column",
  showInvoice = true,
}: {
  statuses: PipelineStatus[];
  items: PipelineCard[];
  updateAction: (formData: FormData) => Promise<{ error?: string; success?: boolean } | void>;
  invoiceAction?: (formData: FormData) => Promise<{ error?: string; invoiceId?: string; success?: boolean } | void>;
  emptyLabel?: string;
  showInvoice?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const filtered = needle
      ? items.filter((item) =>
          [item.title, item.subtitle, item.meta, item.status]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle)
        )
      : items;
    return statuses.map((status) => ({
      status,
      cards: filtered.filter((item) => item.status === status.value),
    }));
  }, [items, statuses, filter]);

  function move(id: string, status: string) {
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", status);
    startTransition(async () => {
      const res = await updateAction(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function bill(id: string) {
    if (!invoiceAction) return;
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      const res = await invoiceAction(fd);
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (res && "invoiceId" in res && res.invoiceId) {
        router.push(`/invoices?preview=${res.invoiceId}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="stack" style={{ gap: "0.85rem" }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Search board…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        {pending ? <span className="muted">Saving…</span> : null}
        {error ? <span style={{ color: "var(--danger)" }}>{error}</span> : null}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
          alignItems: "start",
        }}
      >
        {grouped.map(({ status, cards }) => (
          <div
            key={status.value}
            className="surface"
            style={{
              padding: "0.75rem",
              minHeight: 160,
              borderColor:
                status.value.includes("ready") || status.value === "delivered"
                  ? "rgba(15,118,110,0.35)"
                  : undefined,
            }}
          >
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <strong style={{ fontSize: "0.9rem" }}>{status.label}</strong>
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                {cards.length}
              </span>
            </div>
            <div className="stack" style={{ gap: "0.5rem" }}>
              {cards.map((card) => (
                <div
                  key={card.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 10,
                    padding: "0.65rem 0.7rem",
                    background:
                      card.tone === "alert"
                        ? "rgba(185,28,28,0.06)"
                        : card.tone === "good"
                          ? "rgba(15,118,110,0.06)"
                          : "rgba(255,255,255,0.7)",
                  }}
                >
                  <div style={{ fontWeight: 650, fontSize: "0.9rem" }}>{card.title}</div>
                  {card.subtitle ? (
                    <div className="muted" style={{ fontSize: "0.78rem", marginTop: 2 }}>
                      {card.subtitle}
                    </div>
                  ) : null}
                  {card.meta ? (
                    <div className="muted" style={{ fontSize: "0.75rem", marginTop: 2 }}>
                      {card.meta}
                    </div>
                  ) : null}
                  {card.amountLabel ? (
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", marginTop: 4 }}>
                      {card.amountLabel}
                    </div>
                  ) : null}
                  <div className="field" style={{ marginTop: 8, marginBottom: 0 }}>
                    <select
                      className="select"
                      value={card.status}
                      disabled={pending}
                      onChange={(e) => move(card.id, e.target.value)}
                    >
                      {statuses.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    {showInvoice && invoiceAction && !card.invoiceId ? (
                      <button
                        type="button"
                        className="btn btn-soft"
                        disabled={pending}
                        onClick={() => bill(card.id)}
                        style={{ fontSize: "0.8rem", padding: "0.35rem 0.55rem" }}
                      >
                        Create invoice
                      </button>
                    ) : null}
                    {card.invoiceId ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: "0.8rem", padding: "0.35rem 0.55rem" }}
                        onClick={() => router.push(`/invoices?preview=${card.invoiceId}`)}
                      >
                        Open invoice
                      </button>
                    ) : null}
                    {card.whatsappMessage ? (
                      <WhatsAppCopyButton
                        phone={card.phone}
                        message={card.whatsappMessage}
                        label="WA"
                        className="btn btn-ghost"
                      />
                    ) : null}
                  </div>
                </div>
              ))}
              {!cards.length ? (
                <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
                  {emptyLabel}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
