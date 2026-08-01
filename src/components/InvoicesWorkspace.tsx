"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "@/i18n/navigation";
import {
  revokeInvoiceAction,
  updateInvoiceStatusAction,
} from "@/app/actions";
import { ListPager, useClientPager } from "@/components/ListControls";
import { PatientName } from "@/components/PatientName";
import { RecordPaymentForm } from "@/components/RecordPaymentForm";
import { SubmitLhdnButton } from "@/components/SubmitLhdnButton";
import { PrintInvoiceButton } from "@/components/PrintInvoiceButton";
import { ActionForm } from "@/components/ActionForm";
import { InvoiceCostPanel } from "@/components/InvoiceCostPanel";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { formatDayKeyMY } from "@/lib/datetime-my";
import type { InvoiceLineKind, InvoiceStatus } from "@/lib/types";

export type InvoiceListRow = {
  id: string;
  invoice_number: string;
  title: string | null;
  notes?: string | null;
  status: InvoiceStatus;
  total: number;
  amount_paid: number;
  created_at: string;
  issue_date: string;
  lhdn_status: string | null;
  tax_amount: number;
  customers?: { name: string; risk_level?: "high" | "medium" | "low" | null } | null;
};

function displayInvoiceNotes(notes: string | null | undefined) {
  if (!notes) return null;
  // Strip internal appt marker: "appt:uuid · user notes"
  const cleaned = notes
    .replace(/appt:[0-9a-f-]{36}\s*[·•-]?\s*/i, "")
    .trim();
  return cleaned || null;
}

type PreviewPayload = {
  invoice: InvoiceListRow & {
    subtotal: number;
    medicine_amount?: number;
    additional_amount?: number;
    medicine_description?: string | null;
    additional_description?: string | null;
  };
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    line_kind: InvoiceLineKind;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    paid_at: string;
  }>;
  latestLhdn: { uuid: string | null; status: string | null; myinvoisStatus?: string | null } | null;
  orgName: string;
  orgAddress: string | null;
  orgPhone: string | null;
  serviceChargePercent: number;
  customer: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;
};

function dayKey(iso: string) {
  return formatDayKeyMY(new Date(iso));
}

export function InvoicesWorkspace({
  invoices,
  canLhdn,
  loadPreview,
  labels,
  initialPreviewId,
}: {
  invoices: InvoiceListRow[];
  canLhdn: boolean;
  loadPreview: (id: string) => Promise<{ data?: PreviewPayload; error?: string }>;
  initialPreviewId?: string | null;
  labels: {
    number: string;
    customer: string;
    status: string;
    total: string;
    paid: string;
    createdAt: string;
    actions: string;
    view: string;
    viewPrint: string;
    empty: string;
    revoke: string;
    filterDay: string;
    allDays: string;
    submitLhdn: string;
    submitLhdnHint: string;
    submitLhdnPlanLocked: string;
    submitLhdnNeedTin: string;
    submitLhdnAlready: string;
    refreshLhdnStatus: string;
    lhdnStatusLine: string;
    cancelLhdn: string;
    cancelLhdnHint: string;
    cancelLhdnPrompt: string;
    recordPayment: string;
    balanceDue: string;
    pay: string;
    editStatus: string;
    editStatusHint: string;
    statusNote: string;
    saveStatus: string;
    payments: string;
    noPayments: string;
    date: string;
    method: string;
    print: string;
    billTo: string;
    description: string;
    qty: string;
    price: string;
    amount: string;
    subtotal: string;
    tax: string;
    medicine: string;
    additional: string;
    productService: string;
    serviceTax: string;
    addCost: string;
    deleteCost: string;
    costKind: string;
    costDesc: string;
    costAmount: string;
    extrasHint: string;
    exitWarn: string;
    needTin: boolean;
    planLocked: boolean;
  };
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [day, setDay] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(initialPreviewId || null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const days = useMemo(() => {
    const set = new Set(invoices.map((i) => dayKey(i.created_at)));
    return Array.from(set).sort().reverse();
  }, [invoices]);

  const filtered = useMemo(() => {
    if (!day) return invoices;
    return invoices.filter((i) => dayKey(i.created_at) === day);
  }, [invoices, day]);

  const pager = useClientPager(filtered, 10);

  useEffect(() => {
    if (!previewId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    startTransition(async () => {
      setLoadErr(null);
      const res = await loadPreview(previewId);
      if (cancelled) return;
      if (res.error || !res.data) {
        setLoadErr(res.error || "Failed to load invoice");
        setPreview(null);
        return;
      }
      setPreview(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [previewId, loadPreview]);

  async function closePreview(force = false) {
    if (!force) {
      const ok = await confirm({
        title: "Allvisor",
        message: labels.exitWarn,
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
      });
      if (!ok) return;
    }
    setPreviewId(null);
    setPreview(null);
    router.replace("/invoices");
  }

  async function onRevoke(id: string) {
    const ok = await confirm({
      title: "Allvisor",
      message: "confirm?",
      confirmLabel: "Yes",
      cancelLabel: "Cancel",
      danger: true,
    });
    if (!ok) return;
    const result = await revokeInvoiceAction(id);
    if (result && "error" in result && result.error) {
      await confirm({
        title: "Allvisor",
        message: result.error,
        confirmLabel: "OK",
        hideCancel: true,
      });
      return;
    }
    router.refresh();
  }

  const modal =
    previewId && mounted
      ? createPortal(
          <div
            className="modal-backdrop no-print"
            onClick={() => closePreview(false)}
            role="presentation"
          >
            <div
              className="modal-panel"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {loadErr ? <p style={{ color: "var(--danger)" }}>{loadErr}</p> : null}
              {pending && !preview ? <p className="muted">Loading…</p> : null}
              {preview ? (
                <InvoicePreviewBody
                  data={preview}
                  canLhdn={canLhdn}
                  labels={labels}
                  onSubmitted={() => router.refresh()}
                />
              ) : null}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="row" style={{ marginBottom: "0.75rem" }}>
          <div className="field" style={{ minWidth: 220 }}>
            <label>{labels.filterDay}</label>
            <select
              className="select"
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                pager.setPage(1);
              }}
            >
              <option value="">{labels.allDays}</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{labels.number}</th>
                <th>{labels.customer}</th>
                <th>{labels.status}</th>
                <th>{labels.total}</th>
                <th>{labels.paid}</th>
                <th>{labels.createdAt}</th>
                <th>{labels.actions}</th>
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((inv) => {
                const revoked = inv.status === "void";
                const paid = inv.status === "paid";
                const rowClass = revoked
                  ? "invoice-row-revoked"
                  : paid
                    ? "invoice-row-paid"
                    : "invoice-row-unpaid";
                return (
                  <tr
                    key={inv.id}
                    className={`${rowClass} invoice-row-clickable`}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setPreviewId(inv.id);
                      router.replace(`/invoices?preview=${inv.id}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPreviewId(inv.id);
                        router.replace(`/invoices?preview=${inv.id}`);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open invoice ${inv.invoice_number}`}
                  >
                    <td>
                      <div>{inv.title || inv.invoice_number}</div>
                      {displayInvoiceNotes(inv.notes) ? (
                        <div style={{ fontSize: "0.85rem", marginTop: 2 }}>
                          {displayInvoiceNotes(inv.notes)}
                        </div>
                      ) : null}
                      <div className="muted" style={{ fontSize: "0.8rem" }}>
                        {inv.invoice_number}
                      </div>
                    </td>
                    <td>
                      {inv.customers?.name ? (
                        <PatientName
                          name={inv.customers.name}
                          risk={inv.customers.risk_level}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span className="badge">{inv.status}</span>
                    </td>
                    <td>{formatCurrency(Number(inv.total))}</td>
                    <td>{formatCurrency(Number(inv.amount_paid))}</td>
                    <td>{formatDateTime(inv.created_at)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {!revoked ? (
                        <button
                          type="button"
                          className="btn btn-delete-soft"
                          style={{ padding: "0.35rem 0.7rem" }}
                          onClick={() => onRevoke(inv.id)}
                        >
                          {labels.revoke}
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="muted">
                    {labels.empty}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <ListPager page={pager.page} totalPages={pager.totalPages} onPage={pager.setPage} />
      </div>
      {modal}
    </>
  );
}

type PreviewLabels = {
  submitLhdn: string;
  submitLhdnHint: string;
  submitLhdnPlanLocked: string;
  submitLhdnNeedTin: string;
  submitLhdnAlready: string;
  refreshLhdnStatus: string;
  lhdnStatusLine: string;
  cancelLhdn: string;
  cancelLhdnHint: string;
  cancelLhdnPrompt: string;
  recordPayment: string;
  balanceDue: string;
  pay: string;
  editStatus: string;
  editStatusHint: string;
  statusNote: string;
  saveStatus: string;
  payments: string;
  noPayments: string;
  date: string;
  method: string;
  print: string;
  billTo: string;
  description: string;
  qty: string;
  price: string;
  amount: string;
  subtotal: string;
  tax: string;
  total: string;
  paid: string;
  medicine: string;
  additional: string;
  productService: string;
  serviceTax: string;
  addCost: string;
  deleteCost: string;
  costKind: string;
  costDesc: string;
  costAmount: string;
  extrasHint: string;
  needTin: boolean;
  planLocked: boolean;
};

function InvoicePreviewBody({
  data,
  canLhdn,
  labels,
  onSubmitted,
}: {
  data: PreviewPayload;
  canLhdn: boolean;
  labels: PreviewLabels;
  onSubmitted: () => void;
}) {
  const invoice = data.invoice;
  const editable = invoice.status !== "paid" && invoice.status !== "void";
  const pct = data.serviceChargePercent;
  const billLines = data.lines.filter((l) => l.line_kind !== "service_charge");
  const itemsSubtotal = billLines.reduce((s, l) => s + Number(l.line_total || 0), 0);
  const chargeLine = data.lines.find((l) => l.line_kind === "service_charge");
  const serviceTax =
    chargeLine != null
      ? Number(chargeLine.line_total || 0)
      : Math.round(((itemsSubtotal * pct) / 100) * 100) / 100;
  const latestTotal = Math.max(
    Number(invoice.total) || 0,
    itemsSubtotal + serviceTax + Number(invoice.tax_amount || 0)
  );
  const balance = Math.max(0, latestTotal - Number(invoice.amount_paid || 0));
  const myStatus = data.latestLhdn?.myinvoisStatus;
  const lhdnStatus = invoice.lhdn_status || "not_submitted";

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 className="page-title" style={{ fontSize: "1.35rem" }}>
            {invoice.title || invoice.invoice_number}
          </h2>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {invoice.invoice_number} · {formatDateTime(invoice.created_at)}
          </div>
        </div>
        <div className="row">
          {canLhdn && invoice.status !== "void" ? (
            <SubmitLhdnButton
              inline
              invoiceId={invoice.id}
              label={labels.submitLhdn}
              hint={labels.submitLhdnHint}
              refreshLabel={labels.refreshLhdnStatus}
              hasUuid={Boolean(data.latestLhdn?.uuid)}
              cancelLabel={labels.cancelLhdn}
              cancelHint={labels.cancelLhdnHint}
              cancelPrompt={labels.cancelLhdnPrompt}
              canCancel={
                Boolean(data.latestLhdn?.uuid) &&
                lhdnStatus !== "cancelled" &&
                data.latestLhdn?.status !== "cancelled"
              }
              currentStatusLabel={
                lhdnStatus && lhdnStatus !== "not_submitted"
                  ? labels.lhdnStatusLine.replace("{status}", myStatus || lhdnStatus)
                  : null
              }
              disabledReason={
                labels.planLocked
                  ? labels.submitLhdnPlanLocked
                  : labels.needTin
                    ? labels.submitLhdnNeedTin
                    : lhdnStatus === "accepted"
                      ? labels.submitLhdnAlready.replace(
                          "{status}",
                          myStatus || "Valid"
                        )
                      : null
              }
            />
          ) : null}
          <PrintInvoiceButton label={labels.print} invoiceId={invoice.id} />
        </div>
      </div>

      <div className="surface invoice-sheet" style={{ padding: "1.25rem", boxShadow: "none" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
          <div>
            <div className="display" style={{ fontSize: "1.4rem" }}>
              {data.orgName}
            </div>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              {data.orgAddress || ""}
              {data.orgPhone ? ` · ${data.orgPhone}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="badge">{invoice.status}</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>{invoice.invoice_number}</div>
            <div className="muted">{formatDate(invoice.issue_date)}</div>
          </div>
        </div>
        <div style={{ marginBottom: "0.85rem" }}>
          <div className="muted" style={{ fontSize: "0.8rem" }}>
            {labels.billTo}
          </div>
          <strong>{data.customer?.name || "—"}</strong>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {[data.customer?.address, data.customer?.phone, data.customer?.email]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <InvoiceCostPanel
          invoiceId={invoice.id}
          editable={editable}
          serviceChargePercent={pct}
          lines={data.lines}
          labels={{
            description: labels.description,
            qty: labels.qty,
            price: labels.price,
            amount: labels.amount,
            medicine: labels.medicine,
            additional: labels.additional,
            service: labels.productService,
            serviceCharge: labels.serviceTax,
            addCost: labels.addCost,
            remove: labels.deleteCost,
            costKind: labels.costKind,
            costDesc: labels.costDesc,
            costAmount: labels.costAmount,
            extrasHint: labels.extrasHint,
          }}
        />
        <div style={{ marginTop: "1rem", textAlign: "right" }}>
          <div>
            {labels.subtotal}: <strong>{formatCurrency(itemsSubtotal)}</strong>
          </div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>
            {labels.serviceTax} ({pct}%): {formatCurrency(serviceTax)}
          </div>
          <div style={{ fontSize: "1.15rem", marginTop: 8 }}>
            {labels.total}: <strong>{formatCurrency(Number(invoice.total))}</strong>
          </div>
          <div className="muted">
            {labels.paid}: {formatCurrency(Number(invoice.amount_paid))}
          </div>
        </div>
      </div>

      {editable && balance > 0 ? (
        <RecordPaymentForm
          invoiceId={invoice.id}
          balance={balance}
          labels={{
            title: labels.recordPayment,
            balanceDue: labels.balanceDue,
            pay: labels.pay,
          }}
        />
      ) : null}

      <div className="surface" style={{ padding: "1.1rem", boxShadow: "none" }}>
        <h3 style={{ marginTop: 0 }}>{labels.editStatus}</h3>
        <p className="muted">{labels.editStatusHint}</p>
        <ActionForm
          action={updateInvoiceStatusAction}
          className="row"
          onSuccess={() => onSubmitted()}
        >
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <select name="status" className="select" style={{ width: 160 }} defaultValue={invoice.status}>
            {(["draft", "unpaid", "partial", "paid", "void"] as InvoiceStatus[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            name="note"
            className="input"
            placeholder={labels.statusNote}
            style={{ minWidth: 180 }}
          />
          <button type="submit" className="btn btn-soft">
            {labels.saveStatus}
          </button>
        </ActionForm>
      </div>

      <div className="surface" style={{ padding: "1.1rem", boxShadow: "none" }}>
        <h3 style={{ marginTop: 0 }}>{labels.payments}</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{labels.date}</th>
                <th>{labels.method}</th>
                <th>{labels.amount}</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.paid_at)}</td>
                  <td>{p.method}</td>
                  <td>{formatCurrency(Number(p.amount))}</td>
                </tr>
              ))}
              {!data.payments.length ? (
                <tr>
                  <td colSpan={3} className="muted">
                    {labels.noPayments}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
