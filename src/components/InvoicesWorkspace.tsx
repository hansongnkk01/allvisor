"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "@/i18n/navigation";
import {
  logInvoiceEarlyExitAction,
  revokeInvoiceAction,
  updateInvoiceStatusAction,
} from "@/app/actions";
import { ListPager, SearchField, useClientPager } from "@/components/ListControls";
import { PatientName } from "@/components/PatientName";
import { PatientSafetyBanner } from "@/components/PatientSafetyBanner";
import { RecordPaymentForm } from "@/components/RecordPaymentForm";
import { PrintInvoiceButton } from "@/components/PrintInvoiceButton";
import { SubmitLhdnButton } from "@/components/SubmitLhdnButton";
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
  customers?: {
    name: string;
    risk_level?: "high" | "medium" | "low" | null;
    allergies?: string | null;
  } | null;
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
    risk_level?: "high" | "medium" | "low" | null;
    allergies?: string | null;
  } | null;
  products: Array<{
    id: string;
    name: string;
    unit_price: number;
    quantity: number;
  }>;
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
    resubmitLhdn: string;
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
    costItem: string;
    costQty: string;
    noInventory: string;
    extrasHint: string;
    exitWarn: string;
    exitReasonTitle: string;
    exitReasonHint: string;
    exitReasonPlaceholder: string;
    exitConfirm: string;
    searchPlaceholder: string;
    needTin: boolean;
    planLocked: boolean;
  };
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [day, setDay] = useState("");
  const [q, setQ] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(initialPreviewId || null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitReason, setExitReason] = useState("");
  const [exitError, setExitError] = useState<string | null>(null);
  const [exitPending, startExit] = useTransition();

  useEffect(() => setMounted(true), []);

  const days = useMemo(() => {
    const set = new Set(invoices.map((i) => dayKey(i.created_at)));
    return Array.from(set).sort().reverse();
  }, [invoices]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return invoices.filter((i) => {
      if (day && dayKey(i.created_at) !== day) return false;
      if (!needle) return true;
      const notes = displayInvoiceNotes(i.notes) || "";
      const hay = [
        i.invoice_number,
        i.title || "",
        notes,
        i.customers?.name || "",
        i.status,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [invoices, day, q]);

  const pager = useClientPager(filtered, 10);

  function isFullyPaid(inv: InvoiceListRow | undefined | null) {
    if (!inv) return false;
    if (inv.status === "void") return true;
    return (
      inv.status === "paid" ||
      Number(inv.amount_paid || 0) + 0.001 >= Number(inv.total || 0)
    );
  }

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

  function doClosePreview() {
    setExitOpen(false);
    setExitReason("");
    setExitError(null);
    setPreviewId(null);
    setPreview(null);
    router.replace("/invoices");
  }

  function requestClosePreview() {
    const inv = preview?.invoice;
    if (isFullyPaid(inv)) {
      doClosePreview();
      return;
    }
    setExitReason("");
    setExitError(null);
    setExitOpen(true);
  }

  function confirmEarlyExit() {
    const inv = preview?.invoice;
    const reason = exitReason.trim();
    if (!reason) {
      setExitError("Please enter a reason");
      return;
    }
    if (!inv) {
      doClosePreview();
      return;
    }
    startExit(async () => {
      const fd = new FormData();
      fd.set("invoice_id", inv.id);
      fd.set("reason", reason);
      const result = await logInvoiceEarlyExitAction(fd);
      if (result && "error" in result && result.error) {
        setExitError(result.error);
        return;
      }
      doClosePreview();
      router.refresh();
    });
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

  const reloadPreview = () => {
    const id = previewId;
    if (!id) return;
    startTransition(async () => {
      const res = await loadPreview(id);
      if (res.data) setPreview(res.data);
      router.refresh();
    });
  };

  const modal =
    previewId && mounted
      ? createPortal(
          <div
            className="modal-backdrop"
            onClick={() => requestClosePreview()}
            role="presentation"
          >
            <div
              className="modal-panel invoice-print-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {loadErr ? <p style={{ color: "var(--danger)" }}>{loadErr}</p> : null}
              {pending && !preview ? <p className="muted">Loading…</p> : null}
              {preview ? (
                <InvoicePreviewBody
                  data={preview}
                  labels={labels}
                  canLhdn={canLhdn}
                  onSubmitted={reloadPreview}
                />
              ) : null}
            </div>

            {exitOpen ? (
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 10000,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  background: "rgba(28, 27, 25, 0.5)",
                }}
                onClick={() => setExitOpen(false)}
              >
                <div
                  className="surface"
                  style={{
                    width: "min(440px, 100%)",
                    padding: "1.25rem 1.35rem",
                    background: "#fff",
                    boxShadow: "0 24px 60px rgba(28,27,25,0.28)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="display" style={{ fontSize: "1.25rem", marginBottom: 8 }}>
                    {labels.exitReasonTitle}
                  </div>
                  <p style={{ margin: "0 0 0.85rem", lineHeight: 1.5 }}>
                    {labels.exitReasonHint}
                  </p>
                  <textarea
                    className="textarea"
                    rows={3}
                    value={exitReason}
                    onChange={(e) => setExitReason(e.target.value)}
                    placeholder={labels.exitReasonPlaceholder}
                    autoFocus
                  />
                  {exitError ? (
                    <p style={{ color: "var(--danger)", margin: "0.5rem 0 0" }}>{exitError}</p>
                  ) : null}
                  <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={exitPending}
                      onClick={() => setExitOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={exitPending}
                      onClick={confirmEarlyExit}
                    >
                      {labels.exitConfirm}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="row" style={{ marginBottom: "0.75rem", flexWrap: "wrap", gap: 12 }}>
          <div className="field" style={{ minWidth: 220, flex: "1 1 220px", margin: 0 }}>
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
          <div className="field" style={{ minWidth: 260, flex: "2 1 280px", margin: 0 }}>
            <label>&nbsp;</label>
            <SearchField
              value={q}
              onChange={(v) => {
                setQ(v);
                pager.setPage(1);
              }}
              placeholder={labels.searchPlaceholder}
            />
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
                const lhdnRejected = inv.lhdn_status === "rejected";
                const lhdnNotSubmitted =
                  !inv.lhdn_status || inv.lhdn_status === "not_submitted";
                const paid = inv.status === "paid";
                const rowClass = revoked
                  ? "invoice-row-revoked"
                  : lhdnRejected
                    ? "invoice-row-lhdn-rejected"
                    : lhdnNotSubmitted
                      ? "invoice-row-lhdn-pending"
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
                          allergies={inv.customers.allergies}
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
  resubmitLhdn: string;
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
  costItem: string;
  costQty: string;
  noInventory: string;
  extrasHint: string;
  exitReasonTitle: string;
  exitReasonHint: string;
  exitReasonPlaceholder: string;
  exitConfirm: string;
  searchPlaceholder: string;
  needTin: boolean;
  planLocked: boolean;
};

function InvoicePreviewBody({
  data,
  labels,
  canLhdn,
  onSubmitted,
}: {
  data: PreviewPayload;
  labels: PreviewLabels;
  canLhdn: boolean;
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
  const hasUuid = Boolean(data.latestLhdn?.uuid);
  const canSubmitLhdn =
    canLhdn &&
    !labels.planLocked &&
    !labels.needTin &&
    invoice.status === "paid" &&
    (lhdnStatus === "rejected" || lhdnStatus === "not_submitted");
  const showLhdnActions =
    canLhdn &&
    invoice.status === "paid" &&
    (canSubmitLhdn ||
      lhdnStatus === "rejected" ||
      lhdnStatus === "pending" ||
      lhdnStatus === "accepted" ||
      hasUuid);

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 180px" }}>
          <h2 className="page-title" style={{ fontSize: "1.35rem" }}>
            {invoice.title || invoice.invoice_number}
          </h2>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {invoice.invoice_number} · {formatDateTime(invoice.created_at)}
          </div>
        </div>
        <div
          className="row no-print"
          style={{
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          {lhdnStatus && lhdnStatus !== "not_submitted" ? (
            <span
              className="badge"
              title={myStatus || lhdnStatus}
              style={{
                alignSelf: "center",
                background: lhdnStatus === "rejected" ? "#ffd7a8" : undefined,
              }}
            >
              {labels.lhdnStatusLine.replace("{status}", myStatus || lhdnStatus)}
            </span>
          ) : null}
          {editable && balance > 0 ? (
            <RecordPaymentForm
              compact
              invoiceId={invoice.id}
              balance={balance}
              labels={{
                title: labels.recordPayment,
                balanceDue: labels.balanceDue,
                pay: labels.pay,
              }}
              onSuccess={onSubmitted}
            />
          ) : null}
          <PrintInvoiceButton
            label={labels.print}
            invoiceId={invoice.id}
            style={{
              height: 40,
              padding: "0 0.9rem",
              fontSize: "0.9rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "nowrap",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {showLhdnActions ? (
        <SubmitLhdnButton
          invoiceId={invoice.id}
          inline
          label={lhdnStatus === "rejected" ? labels.resubmitLhdn : labels.submitLhdn}
          hint={labels.submitLhdnHint}
          disabledReason={
            canSubmitLhdn
              ? null
              : labels.planLocked
                ? labels.submitLhdnPlanLocked
                : labels.needTin
                  ? labels.submitLhdnNeedTin
                  : lhdnStatus === "accepted"
                    ? labels.submitLhdnAlready.replace(
                        "{status}",
                        myStatus || lhdnStatus
                      )
                    : lhdnStatus === "pending"
                      ? labels.lhdnStatusLine.replace(
                          "{status}",
                          myStatus || "pending"
                        )
                      : null
          }
          refreshLabel={labels.refreshLhdnStatus}
          hasUuid={hasUuid}
          currentStatusLabel={
            lhdnStatus === "rejected"
              ? labels.lhdnStatusLine.replace("{status}", myStatus || "rejected")
              : null
          }
          cancelLabel={labels.cancelLhdn}
          cancelHint={labels.cancelLhdnHint}
          cancelPrompt={labels.cancelLhdnPrompt}
          canCancel={lhdnStatus === "accepted" && hasUuid}
          onDone={onSubmitted}
        />
      ) : null}

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
          <strong>
            {data.customer?.name ? (
              <PatientName
                name={data.customer.name}
                risk={data.customer.risk_level}
                allergies={data.customer.allergies}
              />
            ) : (
              "—"
            )}
          </strong>
          <PatientSafetyBanner
            risk={data.customer?.risk_level}
            allergies={data.customer?.allergies}
          />
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
          products={data.products || []}
          onUpdated={onSubmitted}
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
            costItem: labels.costItem,
            costQty: labels.costQty,
            noInventory: labels.noInventory,
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

      <div
        className="surface"
        style={{
          padding: "1.1rem",
          boxShadow: "none",
          background: "#fff7ed",
          borderColor: "rgba(194, 120, 40, 0.22)",
        }}
      >
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

      <div
        className="surface"
        style={{
          padding: "1.1rem",
          boxShadow: "none",
          background: "#fef2f2",
          borderColor: "rgba(185, 28, 28, 0.18)",
        }}
      >
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
    </div>
  );
}
