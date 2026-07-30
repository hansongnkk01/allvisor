import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { updateInvoiceStatusAction, recordPaymentAction } from "@/app/actions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PrintInvoiceButton } from "@/components/PrintInvoiceButton";
import { InvoiceExtrasForm } from "@/components/InvoiceExtrasForm";
import type { InvoiceStatus } from "@/lib/types";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("InvoiceDetail");
  const tInv = await getTranslations("Invoices");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();

  const [{ data: invoice }, { data: lines }, { data: payments }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, customers(name, phone, email, address)")
      .eq("id", id)
      .eq("organization_id", ctx.organization.id)
      .maybeSingle(),
    supabase.from("invoice_lines").select("*").eq("invoice_id", id).order("id"),
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

  const editable = invoice.status !== "paid" && invoice.status !== "void";
  const balance = Math.max(0, Number(invoice.total) - Number(invoice.amount_paid));
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

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("description")}</th>
                <th>{t("qty")}</th>
                <th>{t("price")}</th>
                <th>{t("amount")}</th>
              </tr>
            </thead>
            <tbody>
              {(lines || []).map((line) => (
                <tr key={line.id}>
                  <td>{line.description}</td>
                  <td>{line.quantity}</td>
                  <td>{formatCurrency(Number(line.unit_price))}</td>
                  <td>{formatCurrency(Number(line.line_total))}</td>
                </tr>
              ))}
              {Number(invoice.medicine_amount) > 0 || invoice.medicine_description ? (
                <tr>
                  <td>
                    {t("medicine")}
                    {invoice.medicine_description ? ` (${invoice.medicine_description})` : ""}
                  </td>
                  <td>1</td>
                  <td>{formatCurrency(Number(invoice.medicine_amount || 0))}</td>
                  <td>{formatCurrency(Number(invoice.medicine_amount || 0))}</td>
                </tr>
              ) : null}
              {Number(invoice.additional_amount) > 0 || invoice.additional_description ? (
                <tr>
                  <td>
                    {t("additional")}
                    {invoice.additional_description
                      ? ` (${invoice.additional_description})`
                      : ""}
                  </td>
                  <td>1</td>
                  <td>{formatCurrency(Number(invoice.additional_amount || 0))}</td>
                  <td>{formatCurrency(Number(invoice.additional_amount || 0))}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "1rem", textAlign: "right" }}>
          <div>
            {t("subtotal")}: <strong>{formatCurrency(Number(invoice.subtotal))}</strong>
          </div>
          <div>
            {t("tax")}: <strong>{formatCurrency(Number(invoice.tax_amount))}</strong>
          </div>
          <div style={{ fontSize: "1.2rem", marginTop: 6 }}>
            {t("total")}: <strong>{formatCurrency(Number(invoice.total))}</strong>
          </div>
          <div className="muted">
            {t("paid")}: {formatCurrency(Number(invoice.amount_paid))}
          </div>
        </div>
      </div>

      {editable ? (
        <div className="surface no-print" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("extrasTitle")}</h3>
          <p className="muted">{t("extrasHint")}</p>
          <InvoiceExtrasForm
            invoiceId={invoice.id}
            medicineDescription={invoice.medicine_description}
            medicineAmount={Number(invoice.medicine_amount || 0)}
            additionalDescription={invoice.additional_description}
            additionalAmount={Number(invoice.additional_amount || 0)}
            labels={{
              medicine: t("medicine"),
              medicineDesc: t("medicineDesc"),
              medicineAmount: t("medicineAmount"),
              additional: t("additional"),
              additionalDesc: t("additionalDesc"),
              additionalAmount: t("additionalAmount"),
              save: t("saveExtras"),
            }}
          />
        </div>
      ) : null}

      {editable && balance > 0 ? (
        <div className="surface no-print" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("recordPayment")}</h3>
          <p className="muted">
            {t("balanceDue")}: {formatCurrency(balance)}
          </p>
          <ActionForm action={recordPaymentAction} className="row">
            <input type="hidden" name="invoice_id" value={invoice.id} />
            <input
              name="amount"
              type="number"
              step="0.01"
              className="input"
              style={{ width: 140 }}
              defaultValue={balance}
            />
            <select name="method" className="select" style={{ width: 130 }}>
              <option value="cash">cash</option>
              <option value="card">card</option>
              <option value="transfer">transfer</option>
              <option value="ewallet">ewallet</option>
            </select>
            <button type="submit" className="btn btn-primary">
              {t("pay")}
            </button>
          </ActionForm>
        </div>
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
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          {tInv("viewPrint")}
        </span>
      </div>
    </div>
  );
}
