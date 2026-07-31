import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { updateInvoiceStatusAction } from "@/app/actions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PrintInvoiceButton } from "@/components/PrintInvoiceButton";
import { InvoiceCostPanel } from "@/components/InvoiceCostPanel";
import { RecordPaymentForm } from "@/components/RecordPaymentForm";
import { SubmitLhdnButton } from "@/components/SubmitLhdnButton";
import { canUseLhdn } from "@/lib/subscription";
import { canAccessSensitive } from "@/lib/roles";
import type { InvoiceLineKind, InvoiceStatus } from "@/lib/types";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("InvoiceDetail");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();
  const pct = Number(ctx.organization.service_charge_percent ?? 0);

  const [{ data: invoice }, { data: linesRaw }, { data: payments }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, customers(name, phone, email, address)")
      .eq("id", id)
      .eq("organization_id", ctx.organization.id)
      .maybeSingle(),
    supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", id)
      .order("id"),
    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", id)
      .order("paid_at", { ascending: false }),
  ]);

  if (!invoice) {
    return (
      <div className="surface" style={{ padding: "1.25rem" }}>
        <p>{t("notFound")}</p>
        <Link href="/invoices" className="btn btn-ghost">
          {t("back")}
        </Link>
      </div>
    );
  }

  let lines = (linesRaw || []).map((l) => ({
    ...l,
    line_kind: (l.line_kind || "service") as InvoiceLineKind,
  }));

  // Migrate legacy medicine/additional columns into lines once if needed
  const hasMedLine = lines.some((l) => l.line_kind === "medicine");
  const hasAddLine = lines.some((l) => l.line_kind === "additional");
  const hasCharge = lines.some((l) => l.line_kind === "service_charge");

  if (
    invoice.status !== "paid" &&
    invoice.status !== "void" &&
    ((!hasMedLine && Number(invoice.medicine_amount) > 0) ||
      (!hasAddLine && Number(invoice.additional_amount) > 0) ||
      !hasCharge)
  ) {
    if (!hasMedLine && Number(invoice.medicine_amount) > 0) {
      await supabase.from("invoice_lines").insert({
        invoice_id: invoice.id,
        organization_id: ctx.organization.id,
        description: `Medicine (${invoice.medicine_description || "Medicine"})`,
        quantity: 1,
        unit_price: Number(invoice.medicine_amount),
        line_total: Number(invoice.medicine_amount),
        line_kind: "medicine",
      });
    }
    if (!hasAddLine && Number(invoice.additional_amount) > 0) {
      await supabase.from("invoice_lines").insert({
        invoice_id: invoice.id,
        organization_id: ctx.organization.id,
        description: `Additional (${invoice.additional_description || "Additional"})`,
        quantity: 1,
        unit_price: Number(invoice.additional_amount),
        line_total: Number(invoice.additional_amount),
        line_kind: "additional",
      });
    }
    // Rebuild service charge + totals
    const { data: refreshed } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", id)
      .order("id");
    const nonCharge = (refreshed || []).filter((l) => l.line_kind !== "service_charge");
    const base = nonCharge.reduce((s, l) => s + Number(l.line_total || 0), 0);
    const chargeAmt = Math.round(((base * pct) / 100) * 100) / 100;
    const chargeIds = (refreshed || [])
      .filter((l) => l.line_kind === "service_charge")
      .map((l) => l.id);
    if (chargeIds.length) {
      await supabase.from("invoice_lines").delete().in("id", chargeIds);
    }
    await supabase.from("invoice_lines").insert({
      invoice_id: invoice.id,
      organization_id: ctx.organization.id,
      description: `Service charge (${pct}%)`,
      quantity: 1,
      unit_price: chargeAmt,
      line_total: chargeAmt,
      line_kind: "service_charge",
    });
    const subtotal = base;
    const tax = Number(invoice.tax_amount || 0);
    const total = subtotal + chargeAmt + tax;
    await supabase
      .from("invoices")
      .update({ subtotal, total })
      .eq("id", invoice.id);
    invoice.subtotal = subtotal;
    invoice.total = total;

    const { data: finalLines } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", id)
      .order("id");
    lines = (finalLines || []).map((l) => ({
      ...l,
      line_kind: (l.line_kind || "service") as InvoiceLineKind,
    }));
  }

  const editable = invoice.status !== "paid" && invoice.status !== "void";
  const billLinesForPay = lines.filter((l) => l.line_kind !== "service_charge");
  const itemsSubtotalForPay = billLinesForPay.reduce(
    (s, l) => s + Number(l.line_total || 0),
    0
  );
  const chargeLineForPay = lines.find((l) => l.line_kind === "service_charge");
  const serviceTaxForPay =
    chargeLineForPay != null
      ? Number(chargeLineForPay.line_total || 0)
      : Math.round(((itemsSubtotalForPay * pct) / 100) * 100) / 100;
  const latestTotal = Math.max(
    Number(invoice.total) || 0,
    itemsSubtotalForPay + serviceTaxForPay + Number(invoice.tax_amount || 0)
  );
  const balance = Math.max(0, latestTotal - Number(invoice.amount_paid || 0));
  const customer = invoice.customers as {
    name?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title={invoice.title || invoice.invoice_number}
        subtitle={`${invoice.invoice_number} · ${formatDateTime(invoice.created_at)}`}
        actions={
          <div className="row no-print">
            <Link href="/invoices" className="btn btn-ghost">
              {t("exit")}
            </Link>
            <PrintInvoiceButton label={t("print")} invoiceId={invoice.id} />
          </div>
        }
      />

      <div className="surface invoice-sheet" style={{ padding: "1.5rem" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <div className="display" style={{ fontSize: "1.6rem" }}>
              {ctx.organization.name}
            </div>
            <div className="muted" style={{ fontSize: "0.9rem" }}>
              {ctx.organization.address || ""}
              {ctx.organization.phone ? ` · ${ctx.organization.phone}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="badge">{invoice.status}</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>{invoice.invoice_number}</div>
            <div className="muted">{formatDate(invoice.issue_date)}</div>
            <div className="muted" style={{ fontSize: "0.85rem" }}>
              {formatDateTime(invoice.created_at)}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <div className="muted" style={{ fontSize: "0.8rem" }}>
            {t("billTo")}
          </div>
          <strong>{customer?.name || "—"}</strong>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {[customer?.address, customer?.phone, customer?.email].filter(Boolean).join(" · ")}
          </div>
        </div>

        <InvoiceCostPanel
          invoiceId={invoice.id}
          editable={editable}
          serviceChargePercent={pct}
          lines={lines.map((l) => ({
            id: l.id,
            description: l.description,
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price),
            line_total: Number(l.line_total),
            line_kind: l.line_kind,
          }))}
          labels={{
            description: t("description"),
            qty: t("qty"),
            price: t("price"),
            amount: t("amount"),
            medicine: t("medicine"),
            additional: t("additional"),
            service: t("productService"),
            serviceCharge: t("serviceTax"),
            addCost: t("addCost"),
            remove: t("deleteCost"),
            costKind: t("costKind"),
            costDesc: t("costDesc"),
            costAmount: t("costAmount"),
            extrasHint: t("extrasHint"),
          }}
        />

        {(() => {
          const billLines = lines.filter((l) => l.line_kind !== "service_charge");
          const itemsSubtotal = billLines.reduce(
            (s, l) => s + Number(l.line_total || 0),
            0
          );
          const chargeLine = lines.find((l) => l.line_kind === "service_charge");
          const serviceTax =
            chargeLine != null
              ? Number(chargeLine.line_total || 0)
              : Math.round(((itemsSubtotal * pct) / 100) * 100) / 100;
          return (
            <div style={{ marginTop: "1rem", textAlign: "right" }}>
              <div>
                {t("subtotal")}: <strong>{formatCurrency(itemsSubtotal)}</strong>
              </div>
              <div
                className="muted"
                style={{ fontSize: "0.8rem", marginTop: 4, lineHeight: 1.4 }}
              >
                {t("serviceTax")} ({pct}%): {formatCurrency(serviceTax)}
              </div>
              {Number(invoice.tax_amount) > 0 ? (
                <div style={{ marginTop: 4 }}>
                  {t("tax")}: <strong>{formatCurrency(Number(invoice.tax_amount))}</strong>
                </div>
              ) : null}
              <div style={{ fontSize: "1.2rem", marginTop: 8 }}>
                {t("total")}: <strong>{formatCurrency(Number(invoice.total))}</strong>
              </div>
              <div className="muted">
                {t("paid")}: {formatCurrency(Number(invoice.amount_paid))}
              </div>
            </div>
          );
        })()}
      </div>

      {editable && balance > 0 ? (
        <RecordPaymentForm
          invoiceId={invoice.id}
          balance={balance}
          labels={{
            title: t("recordPayment"),
            balanceDue: t("balanceDue"),
            pay: t("pay"),
          }}
        />
      ) : null}

      {canAccessSensitive(ctx.membership.role) && invoice.status !== "void" ? (
        <SubmitLhdnButton
          invoiceId={invoice.id}
          label={t("submitLhdn")}
          hint={t("submitLhdnHint")}
          disabledReason={
            !canUseLhdn(
              ctx.organization.subscription_plan,
              ctx.organization.subscription_status
            )
              ? t("submitLhdnPlanLocked")
              : !ctx.organization.tin
                ? t("submitLhdnNeedTin")
                : invoice.lhdn_status === "accepted"
                  ? t("submitLhdnAlready", { status: invoice.lhdn_status })
                  : null
          }
        />
      ) : null}

      <div className="surface no-print" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("editStatus")}</h3>
        <p className="muted">{t("editStatusHint")}</p>
        <ActionForm action={updateInvoiceStatusAction} className="row">
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <select
            name="status"
            className="select"
            style={{ width: 160 }}
            defaultValue={invoice.status}
          >
            {(["draft", "unpaid", "partial", "paid", "void"] as InvoiceStatus[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            name="note"
            className="input"
            style={{ minWidth: 220 }}
            placeholder={t("statusNote")}
          />
          <button type="submit" className="btn btn-primary">
            {t("saveStatus")}
          </button>
        </ActionForm>
      </div>

      <div className="surface no-print" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("payments")}</h3>
        {(payments || []).length ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("method")}</th>
                  <th>{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {payments!.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDateTime(p.paid_at)}</td>
                    <td>{p.method}</td>
                    <td>{formatCurrency(Number(p.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">{t("noPayments")}</p>
        )}
      </div>

      <div className="row no-print">
        <Link href="/invoices" className="btn btn-soft">
          {t("exit")}
        </Link>
      </div>
    </div>
  );
}
