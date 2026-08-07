import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireOwner } from "@/lib/require-owner";
import { getNicheVocab, accountingCategories } from "@/lib/niches";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { createExpenseAction, createIncomeAction } from "@/app/actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { accountingPeriodRange, formatDayKeyMY, type AccountingPeriod } from "@/lib/datetime-my";
import { AccountingCashChart } from "@/components/AccountingCashChart";
import {
  AccountingExpenseTable,
  AccountingLedgerTable,
} from "@/components/AccountingPagedTables";
import { RECEIVABLE_OVERDUE_DAYS } from "@/lib/dashboard-data";

/**
 * The owner's money view: bookkeeping and receivables in one place. Staff and
 * managers keep the separate /accounting page for day-to-day entry.
 */

const PERIODS: AccountingPeriod[] = [
  "today",
  "this_week",
  "this_month",
  "prev_3_months",
  "prev_6_months",
  "this_year",
];

function isPeriod(v: string | undefined): v is AccountingPeriod {
  return !!v && (PERIODS as string[]).includes(v);
}

export default async function MoneyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Owner");
  const tAcc = await getTranslations("Accounting");
  const { supabase, organization } = await requireOwner(locale);
  const orgId = organization.id;

  const period: AccountingPeriod = isPeriod(sp.period) ? sp.period : "this_month";
  const { startDay, endDay } = accountingPeriodRange(period);
  const cats = accountingCategories(getNicheVocab(organization.niche).accountingFlavor);

  const now = new Date();
  const overdueCutoff = new Date(now.getTime() - RECEIVABLE_OVERDUE_DAYS * 86400000);

  const [{ data: expenses }, { data: ledger }, { data: openInvoices }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("organization_id", orgId)
      .gte("expense_date", startDay)
      .lte("expense_date", endDay)
      .order("expense_date", { ascending: false }),
    supabase
      .from("ledger_entries")
      .select("*")
      .eq("organization_id", orgId)
      .gte("entry_date", startDay)
      .lte("entry_date", endDay)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, invoice_number, title, total, amount_paid, created_at, customers(name)")
      .eq("organization_id", orgId)
      .in("status", ["unpaid", "partial"])
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  const income = (ledger || [])
    .filter((e) => e.entry_type === "income")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const expenseTotal = (ledger || [])
    .filter((e) => e.entry_type === "expense")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const profit = income - expenseTotal;
  const margin = income > 0 ? Math.round((profit / income) * 100) : 0;

  const byCategory = new Map<string, number>();
  for (const row of expenses || []) {
    const key = (row.category as string) || "—";
    byCategory.set(key, (byCategory.get(key) || 0) + Number(row.amount));
  }
  const categoryRows = [...byCategory.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      share: expenseTotal > 0 ? Math.round((amount / expenseTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const receivables = (openInvoices || []).map((inv) => {
    const customer = Array.isArray(inv.customers) ? inv.customers[0] : inv.customers;
    const createdAt = new Date(inv.created_at as string);
    return {
      id: inv.id as string,
      label: (inv.title || inv.invoice_number) as string,
      customer: (customer?.name as string | undefined) || null,
      outstanding: Math.max(0, Number(inv.total) - Number(inv.amount_paid || 0)),
      createdAt,
      overdue: createdAt < overdueCutoff,
    };
  });
  const overdueRows = receivables.filter((row) => row.overdue);
  const currentTotal = receivables
    .filter((row) => !row.overdue)
    .reduce((sum, row) => sum + row.outstanding, 0);
  const overdueTotal = overdueRows.reduce((sum, row) => sum + row.outstanding, 0);

  const periodLabels: Record<AccountingPeriod, string> = {
    today: tAcc("filterToday"),
    this_week: tAcc("filterThisWeek"),
    this_month: tAcc("filterThisMonth"),
    prev_3_months: tAcc("filterPrev3"),
    prev_6_months: tAcc("filterPrev6"),
    this_year: tAcc("filterThisYear"),
  };

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("moneyTitle")} subtitle={t("moneySubtitle")} />

      <div className="surface" style={{ padding: "0.9rem 1.1rem" }}>
        <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {tAcc("filter")}:
          </span>
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/money?period=${p}`}
              className={period === p ? "btn btn-primary" : "btn btn-ghost"}
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
            >
              {periodLabels[p]}
            </Link>
          ))}
        </div>
      </div>

      <div className="fluid-grid-kpi">
        <div className="surface kpi">
          <div className="kpi-label">{tAcc("income")}</div>
          <div className="kpi-value">{formatCurrency(income)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{tAcc("expense")}</div>
          <div className="kpi-value">{formatCurrency(expenseTotal)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{tAcc("profit")}</div>
          <div className="kpi-value">{formatCurrency(profit)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("marginLabel")}</div>
          <div className="kpi-value">{margin}%</div>
        </div>
      </div>

      <div className="fluid-grid-kpi">
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
      </div>

      <div className="fluid-grid">
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{tAcc("addIncome")}</h3>
          <ActionForm action={createIncomeAction} className="stack">
            <div className="field">
              <label>{tAcc("category")}</label>
              <select name="category" className="select" defaultValue={cats.income[0]}>
                {cats.income.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{tAcc("amount")}</label>
              <input name="amount" type="number" step="0.01" required className="input" />
            </div>
            <div className="field">
              <label>{tAcc("date")}</label>
              <input name="entry_date" type="date" className="input" defaultValue={formatDayKeyMY()} />
            </div>
            <div className="field">
              <label>{tAcc("description")}</label>
              <input name="description" className="input" />
            </div>
            <button type="submit" className="btn btn-primary">
              {tAcc("save")}
            </button>
          </ActionForm>
        </div>

        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{tAcc("addExpense")}</h3>
          <ActionForm action={createExpenseAction} className="stack">
            <div className="field">
              <label>{tAcc("category")}</label>
              <select name="category" className="select" defaultValue={cats.expense[0]}>
                {cats.expense.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{tAcc("amount")}</label>
              <input name="amount" type="number" step="0.01" required className="input" />
            </div>
            <div className="field">
              <label>{tAcc("date")}</label>
              <input name="expense_date" type="date" className="input" defaultValue={formatDayKeyMY()} />
            </div>
            <div className="field">
              <label>{tAcc("description")}</label>
              <input name="description" className="input" />
            </div>
            <button type="submit" className="btn btn-primary">
              {tAcc("save")}
            </button>
          </ActionForm>
        </div>
      </div>

      <AccountingCashChart
        ledger={(ledger || []).map((e) => ({
          id: e.id,
          entry_type: e.entry_type,
          amount: e.amount,
          entry_date: e.entry_date,
          created_at: e.created_at,
          description: e.description,
        }))}
        labels={{
          title: tAcc("chartTitle"),
          byHour: tAcc("chartByHour"),
          byDay: tAcc("chartByDay"),
          byWeek: tAcc("chartByWeek"),
          byMonth: tAcc("chartByMonth"),
          income: tAcc("income"),
          expense: tAcc("expense"),
          empty: tAcc("emptyLedger"),
        }}
      />

      <section className="surface" style={{ padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("expenseByCategoryTitle")}</h2>
        <table className="table">
          <thead>
            <tr>
              <th>{tAcc("category")}</th>
              <th>{tAcc("amount")}</th>
              <th>{t("shareLabel")}</th>
            </tr>
          </thead>
          <tbody>
            {categoryRows.map((row) => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td>{formatCurrency(row.amount)}</td>
                <td>{row.share}%</td>
              </tr>
            ))}
            {categoryRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  {tAcc("empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>{t("oldestOutstanding")}</h2>
          <Link href="/invoices" className="btn btn-soft">
            {t("openInvoices")}
          </Link>
        </div>
        <p className="muted">{t("overdueHint", { days: RECEIVABLE_OVERDUE_DAYS })}</p>
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
            {receivables.slice(0, 15).map((row) => (
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
            {receivables.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  {t("noOutstanding")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <div className="fluid-grid">
        <AccountingLedgerTable
          title={tAcc("cashFlowLedger")}
          exportLabel={tAcc("exportCsv")}
          filename={`allvisor-cash-flow-${period}.csv`}
          empty={tAcc("emptyLedger")}
          rows={(ledger || []).map((e) => ({
            id: e.id,
            entry_date: e.entry_date,
            entry_type: e.entry_type,
            description: e.description,
            source: e.source,
            amount: e.amount,
            created_at: e.created_at,
          }))}
          labels={{
            date: tAcc("date"),
            type: tAcc("type"),
            description: tAcc("description"),
            source: tAcc("source"),
            amount: tAcc("amount"),
            recordedAt: tAcc("recordedAt"),
          }}
        />

        <AccountingExpenseTable
          title={tAcc("expenseList")}
          exportLabel={tAcc("exportCsv")}
          filename={`allvisor-expenses-${period}.csv`}
          empty={tAcc("empty")}
          rows={(expenses || []).map((e) => ({
            id: e.id,
            expense_date: e.expense_date,
            category: e.category,
            description: e.description,
            amount: e.amount,
          }))}
          labels={{
            date: tAcc("date"),
            category: tAcc("category"),
            description: tAcc("description"),
            amount: tAcc("amount"),
          }}
        />
      </div>
    </div>
  );
}
