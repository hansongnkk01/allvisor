import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOwner } from "@/lib/require-owner";
import { PageHeader } from "@/components/PageHeader";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatDayKeyMY } from "@/lib/datetime-my";

const OVERDUE_AFTER_DAYS = 30;

export default async function CashflowPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Owner");
  const { supabase, organization } = await requireOwner(locale);
  const orgId = organization.id;

  const now = new Date();
  const monthStart = `${formatDayKeyMY(now).slice(0, 7)}-01`;
  const overdueCutoff = new Date(now.getTime() - OVERDUE_AFTER_DAYS * 86400000);

  const [{ data: openInvoices }, { data: ledger }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, title, total, amount_paid, created_at, customers(name)")
      .eq("organization_id", orgId)
      .in("status", ["unpaid", "partial"])
      .order("created_at", { ascending: true })
      .limit(200),
    supabase
      .from("ledger_entries")
      .select("entry_type, amount")
      .eq("organization_id", orgId)
      .gte("entry_date", monthStart),
  ]);

  const rows = (openInvoices || []).map((inv) => {
    const customer = Array.isArray(inv.customers) ? inv.customers[0] : inv.customers;
    const outstanding = Math.max(0, Number(inv.total) - Number(inv.amount_paid || 0));
    const createdAt = new Date(inv.created_at as string);
    return {
      id: inv.id as string,
      label: (inv.title || inv.invoice_number) as string,
      customer: (customer?.name as string | undefined) || null,
      outstanding,
      createdAt,
      overdue: createdAt < overdueCutoff,
    };
  });

  const overdueRows = rows.filter((r) => r.overdue);
  const currentTotal = rows
    .filter((r) => !r.overdue)
    .reduce((sum, r) => sum + r.outstanding, 0);
  const overdueTotal = overdueRows.reduce((sum, r) => sum + r.outstanding, 0);

  const income = (ledger || [])
    .filter((e) => e.entry_type === "income")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const expense = (ledger || [])
    .filter((e) => e.entry_type === "expense")
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("cashflowTitle")} subtitle={t("cashflowSubtitle")} />

      <div className="fluid-grid">
        <div className="surface kpi">
          <div className="kpi-label">{t("receivablesCurrent")}</div>
          <div className="kpi-value">{formatCurrency(currentTotal)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("receivablesOverdue")}</div>
          <div className="kpi-value">{formatCurrency(overdueTotal)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("overdueCount")}</div>
          <div className="kpi-value">{overdueRows.length}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("netThisMonth")}</div>
          <div className="kpi-value">{formatCurrency(income - expense)}</div>
        </div>
      </div>

      <section className="surface" style={{ padding: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>{t("oldestOutstanding")}</h2>
          <Link href="/invoices" className="btn btn-soft">
            {t("openInvoices")}
          </Link>
        </div>
        <p className="muted">{t("overdueHint", { days: OVERDUE_AFTER_DAYS })}</p>
        <table className="table">
          <thead>
            <tr>
              <th>{t("invoiceLabel")}</th>
              <th>{t("customerLabel")}</th>
              <th>{t("raisedOn")}</th>
              <th>{t("outstanding")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 15).map((row) => (
              <tr key={row.id}>
                <td>
                  {row.label}
                  {row.overdue ? (
                    <span className="badge" style={{ marginLeft: "0.4rem" }}>
                      {t("overdueBadge")}
                    </span>
                  ) : null}
                </td>
                <td>{row.customer || "—"}</td>
                <td>{formatDate(row.createdAt, locale)}</td>
                <td>{formatCurrency(row.outstanding)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  {t("noOutstanding")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
