import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { MultiLineInvoiceForm } from "@/components/MultiLineInvoiceForm";
import { createInvoiceAction, recordPaymentAction } from "@/app/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ServiceItem } from "@/lib/types";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Invoices");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();

  const [{ data: invoices }, { data: customers }, { data: services }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("*, customers(name)")
        .eq("organization_id", ctx.organization.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("customers")
        .select("id, name")
        .eq("organization_id", ctx.organization.id)
        .order("name"),
      supabase
        .from("service_items")
        .select("*, service_categories(name)")
        .eq("organization_id", ctx.organization.id)
        .eq("is_active", true)
        .order("name"),
    ]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("add")}</h3>
        <MultiLineInvoiceForm
          customers={customers || []}
          services={(services || []) as ServiceItem[]}
          action={createInvoiceAction}
          labels={{
            customer: t("customer"),
            invoiceNumber: t("invoiceNumber"),
            invoiceTitle: t("invoiceTitle"),
            lines: t("lines"),
            description: t("description"),
            qty: t("qty"),
            price: t("price"),
            selectPrice: t("selectPrice"),
            tax: t("tax"),
            save: t("save"),
            addLine: t("addLine"),
            removeLine: t("removeLine"),
            subtotal: t("subtotal"),
            total: t("total"),
            customNumberHint: t("customNumberHint"),
          }}
        />
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("number")}</th>
                <th>{t("customer")}</th>
                <th>{t("status")}</th>
                <th>{t("total")}</th>
                <th>{t("paid")}</th>
                <th>{t("actions")}</th>
                <th>{t("recordPayment")}</th>
              </tr>
            </thead>
            <tbody>
              {(invoices || []).map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div>{inv.title || inv.invoice_number}</div>
                    <div className="muted" style={{ fontSize: "0.8rem" }}>
                      {inv.invoice_number} · {formatDate(inv.issue_date)}
                    </div>
                  </td>
                  <td>{inv.customers?.name || "—"}</td>
                  <td>
                    <span className="badge">{inv.status}</span>
                  </td>
                  <td>{formatCurrency(Number(inv.total))}</td>
                  <td>{formatCurrency(Number(inv.amount_paid))}</td>
                  <td>
                    <Link href={`/invoices/${inv.id}`} className="btn btn-soft" style={{ padding: "0.35rem 0.7rem" }}>
                      {inv.status === "paid" ? t("viewPrint") : t("view")}
                    </Link>
                  </td>
                  <td>
                    {inv.status !== "paid" && inv.status !== "void" ? (
                      <ActionForm action={recordPaymentAction} className="row">
                        <input type="hidden" name="invoice_id" value={inv.id} />
                        <input
                          name="amount"
                          type="number"
                          step="0.01"
                          className="input"
                          style={{ width: 100 }}
                          defaultValue={Number(inv.total) - Number(inv.amount_paid)}
                        />
                        <select name="method" className="select" style={{ width: 110 }}>
                          <option value="cash">cash</option>
                          <option value="card">card</option>
                          <option value="transfer">transfer</option>
                          <option value="ewallet">ewallet</option>
                        </select>
                        <button type="submit" className="btn btn-soft" style={{ padding: "0.45rem 0.8rem" }}>
                          Pay
                        </button>
                      </ActionForm>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!invoices?.length ? (
                <tr>
                  <td colSpan={7} className="muted">
                    {t("empty")}
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
