"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { getPatientTimelineAction } from "@/app/actions";
import { PatientName } from "@/components/PatientName";
import { PatientSafetyBanner } from "@/components/PatientSafetyBanner";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Customer } from "@/lib/types";

export type TimelineLabels = {
  timeline: string;
  close: string;
  loading: string;
  empty: string;
  visits: string;
  invoices: string;
  notes: string;
  allergies: string;
  contact: string;
  status: string;
  total: string;
  paid: string;
};

type TimelineData = NonNullable<
  Awaited<ReturnType<typeof getPatientTimelineAction>>["data"]
>;

type TimelineEvent =
  | {
      kind: "appointment";
      at: string;
      id: string;
      title: string;
      status: string;
      notes: string | null;
    }
  | {
      kind: "invoice";
      at: string;
      id: string;
      invoice_number: string;
      title: string | null;
      status: string;
      total: number;
      amount_paid: number;
    };

export function PatientTimelineButton({
  customer,
  labels,
}: {
  customer: Customer;
  labels: TimelineLabels;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<TimelineData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  function openTimeline() {
    setOpen(true);
    setError(null);
    startTransition(async () => {
      const res = await getPatientTimelineAction(customer.id);
      if (res && "error" in res && res.error) {
        setError(res.error);
        setData(null);
        return;
      }
      setData(res.data || null);
    });
  }

  const events = useMemo(() => {
    if (!data) return [] as TimelineEvent[];
    const list: TimelineEvent[] = [
      ...data.appointments.map((a) => ({
        kind: "appointment" as const,
        at: a.starts_at,
        id: a.id,
        title: a.title,
        status: a.status,
        notes: a.notes,
      })),
      ...data.invoices.map((inv) => ({
        kind: "invoice" as const,
        at: inv.issue_date || inv.created_at,
        id: inv.id,
        invoice_number: inv.invoice_number,
        title: inv.title,
        status: inv.status,
        total: inv.total,
        amount_paid: inv.amount_paid,
      })),
    ];
    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [data]);

  const profile = data?.customer || customer;

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="modal-backdrop no-print"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <div
              className="modal-panel"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={labels.timeline}
              style={{ maxWidth: 640 }}
            >
              <div
                className="row"
                style={{ justifyContent: "space-between", marginBottom: 8 }}
              >
                <h3 style={{ margin: 0 }}>{labels.timeline}</h3>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  {labels.close}
                </button>
              </div>

              <PatientName
                name={profile.name}
                risk={profile.risk_level}
                allergies={profile.allergies}
              />
              <PatientSafetyBanner
                risk={profile.risk_level}
                allergies={profile.allergies}
              />

              <div
                className="muted"
                style={{ fontSize: "0.85rem", marginBottom: "0.85rem", lineHeight: 1.45 }}
              >
                {[profile.ic_number, profile.phone, profile.email, profile.address]
                  .filter(Boolean)
                  .join(" · ") || labels.contact}
              </div>

              {profile.allergies ? (
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>
                  <strong>{labels.allergies}:</strong> {profile.allergies}
                </p>
              ) : null}
              {profile.notes ? (
                <p style={{ margin: "0 0 0.85rem", fontSize: "0.9rem" }}>
                  <strong>{labels.notes}:</strong> {profile.notes}
                </p>
              ) : null}

              {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
              {pending && !data ? <p className="muted">{labels.loading}</p> : null}

              {!pending && data && !events.length ? (
                <p className="muted">{labels.empty}</p>
              ) : null}

              <div className="stack" style={{ gap: "0.55rem" }}>
                {events.map((ev) =>
                  ev.kind === "appointment" ? (
                    <div
                      key={`a-${ev.id}`}
                      style={{
                        padding: "0.65rem 0.75rem",
                        borderRadius: 12,
                        background: "rgba(15, 118, 110, 0.07)",
                        border: "1px solid rgba(15, 118, 110, 0.2)",
                      }}
                    >
                      <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                        <strong style={{ fontSize: "0.9rem" }}>
                          {labels.visits}: {ev.title}
                        </strong>
                        <span className="muted" style={{ fontSize: "0.8rem" }}>
                          {formatDateTime(ev.at)}
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>
                        {labels.status}: {ev.status}
                      </div>
                      {ev.notes ? (
                        <div style={{ fontSize: "0.85rem", marginTop: 4 }}>{ev.notes}</div>
                      ) : null}
                    </div>
                  ) : (
                    <div
                      key={`i-${ev.id}`}
                      style={{
                        padding: "0.65rem 0.75rem",
                        borderRadius: 12,
                        background: "rgba(15, 23, 42, 0.04)",
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                      }}
                    >
                      <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                        <strong style={{ fontSize: "0.9rem" }}>
                          {labels.invoices}: {ev.invoice_number}
                        </strong>
                        <span className="muted" style={{ fontSize: "0.8rem" }}>
                          {formatDateTime(ev.at)}
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>
                        {ev.title || "—"} · {labels.status}: {ev.status}
                      </div>
                      <div style={{ fontSize: "0.85rem", marginTop: 4, fontWeight: 600 }}>
                        {labels.total} {formatCurrency(ev.total)} · {labels.paid}{" "}
                        {formatCurrency(ev.amount_paid)}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        className="btn btn-soft"
        style={{ padding: "0.35rem 0.7rem" }}
        onClick={openTimeline}
      >
        {labels.timeline}
      </button>
      {modal}
    </>
  );
}
