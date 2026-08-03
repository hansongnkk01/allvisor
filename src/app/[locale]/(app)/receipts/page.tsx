import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { hasCapability } from "@/lib/niches";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { PrintInvoiceButton } from "@/components/PrintInvoiceButton";
import { refundInvoiceAction } from "@/app/retail-actions";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function ReceiptsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; employee?: string; customer?: string; receipt?: string }>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("RetailPages");
  const ctx = await requireOrg(locale);
  if (!hasCapability(ctx.organization.niche, "receipts")) redirect({ href: "/dashboard", locale });
  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select("id, invoice_number, title, issue_date, created_at, total, amount_paid, customer_id, created_by_name, refund_of_invoice_id, customers(name)")
    .eq("organization_id", ctx.organization.id)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(300);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999`);
  if (filters.employee) query = query.eq("created_by_name", filters.employee);
  if (filters.customer) query = query.eq("customer_id", filters.customer);
  const [{ data: receipts }, { data: customers }] = await Promise.all([
    query,
    supabase.from("customers").select("id, name").eq("organization_id", ctx.organization.id).order("name"),
  ]);
  const employeeNames = [...new Set((receipts || []).map((receipt) => receipt.created_by_name).filter(Boolean))] as string[];
  const selectedId = filters.receipt || receipts?.[0]?.id;
  const selected = (receipts || []).find((receipt) => receipt.id === selectedId) || null;
  const [{ data: lines }, { data: payments }, { data: refund }] = selected
    ? await Promise.all([
        supabase.from("invoice_lines").select("id, description, quantity, unit_price, line_total").eq("invoice_id", selected.id),
        supabase.from("payments").select("id, method, amount, note, paid_at").eq("invoice_id", selected.id),
        supabase.from("invoices").select("id, invoice_number").eq("refund_of_invoice_id", selected.id).limit(1).maybeSingle(),
      ])
    : [{ data: [] }, { data: [] }, { data: null }];

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("receiptsTitle")} subtitle={t("receiptsSubtitle")} />
      <form className="surface row" style={{ padding: "1rem", flexWrap: "wrap" }}>
        <input className="input" type="date" name="from" defaultValue={filters.from} aria-label="From date" />
        <input className="input" type="date" name="to" defaultValue={filters.to} aria-label="To date" />
        <select className="select" name="employee" defaultValue={filters.employee || ""}>
          <option value="">All employees</option>
          {employeeNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select className="select" name="customer" defaultValue={filters.customer || ""}>
          <option value="">All customers</option>
          {(customers || []).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
        <button className="btn btn-primary" type="submit">Filter</button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, .8fr) minmax(360px, 1.2fr)", gap: "1rem", alignItems: "start" }}>
        <div className="surface" style={{ padding: "1rem" }}>
          <div className="stack" style={{ gap: ".5rem" }}>
            {(receipts || []).map((receipt) => {
              const customerRaw = Array.isArray(receipt.customers) ? receipt.customers[0] : receipt.customers;
              const customer = customerRaw as { name?: string } | null;
              const qs = new URLSearchParams();
              if (filters.from) qs.set("from", filters.from);
              if (filters.to) qs.set("to", filters.to);
              if (filters.employee) qs.set("employee", filters.employee);
              if (filters.customer) qs.set("customer", filters.customer);
              qs.set("receipt", receipt.id);
              return (
                <Link
                  key={receipt.id}
                  href={`/receipts?${qs.toString()}`}
                  className="btn btn-soft"
                  style={{ display: "block", textAlign: "left", height: "auto", padding: ".75rem" }}
                >
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>{receipt.invoice_number}</strong><strong>{formatCurrency(Number(receipt.total))}</strong>
                  </div>
                  <div className="muted" style={{ fontSize: ".8rem", marginTop: 4 }}>
                    {customer?.name || "Walk-in"} · {receipt.created_by_name || "Staff"} · {formatDateTime(receipt.created_at)}
                  </div>
                </Link>
              );
            })}
            {!receipts?.length ? <p className="muted">No paid receipts match these filters.</p> : null}
          </div>
        </div>

        <div className="surface invoice-print-area" style={{ padding: "1.25rem" }}>
          {selected ? (
            <>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "start" }}>
                <div><h2 style={{ margin: 0 }}>Receipt {selected.invoice_number}</h2><p className="muted">{formatDateTime(selected.created_at)}</p></div>
                <PrintInvoiceButton label="Print receipt" invoiceId={selected.id} />
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
                  <tbody>
                    {(lines || []).map((line) => (
                      <tr key={line.id}>
                        <td>{line.description}</td><td>{Number(line.quantity)}</td>
                        <td>{formatCurrency(Number(line.unit_price))}</td><td>{formatCurrency(Number(line.line_total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row" style={{ justifyContent: "space-between", marginTop: "1rem", fontSize: "1.1rem" }}>
                <strong>Total</strong><strong>{formatCurrency(Number(selected.total))}</strong>
              </div>
              <p className="muted" style={{ fontSize: ".85rem" }}>
                Payment: {(payments || []).map((payment) => `${payment.method} ${formatCurrency(Number(payment.amount))}`).join(", ") || "—"}
              </p>
              <div className="row" style={{ marginTop: "1rem", flexWrap: "wrap" }}>
                <Link className="btn btn-soft" href={`/invoices?preview=${selected.id}`}>Open invoice</Link>
                {refund ? (
                  <span className="badge">Refunded as {refund.invoice_number}</span>
                ) : selected.refund_of_invoice_id ? (
                  <span className="badge">Refund receipt</span>
                ) : (
                  <ActionForm action={refundInvoiceAction} className="row">
                    <input type="hidden" name="invoice_id" value={selected.id} />
                    <input className="input" name="note" defaultValue={`Refund ${selected.invoice_number}`} aria-label="Refund note" />
                    <button className="btn btn-ghost" type="submit">Refund full receipt</button>
                  </ActionForm>
                )}
              </div>
            </>
          ) : <p className="muted">Select a receipt.</p>}
        </div>
      </div>
    </div>
  );
}
