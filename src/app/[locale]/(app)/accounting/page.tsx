import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { createExpenseAction, createIncomeAction, isSectionUnlocked } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import { canAccessSensitive } from "@/lib/roles";
import { SectionLockGate } from "@/components/SectionLockGate";
import { SectionActivityLog } from "@/components/SectionActivityLog";
import { fetchSectionLogs } from "@/lib/section-logs";
import {
  accountingPeriodRange,
  formatDayKeyMY,
  type AccountingPeriod,
} from "@/lib/datetime-my";
import { AccountingCashChart } from "@/components/AccountingCashChart";
import {
  AccountingExpenseTable,
  AccountingLedgerTable,
} from "@/components/AccountingPagedTables";

const CLINIC_EXPENSE_CATS = [
  "Rent",
  "Utilities",
  "Medicine / Supplies",
  "Staff salary",
  "Equipment",
  "Lab / Outsource",
  "Marketing",
  "Other",
];

const CLINIC_INCOME_CATS = [
  "Consultation",
  "Procedure",
  "Medicine sales",
  "Other income",
];

const RETAIL_EXPENSE_CATS = [
  "Rent",
  "Utilities",
  "Cost of goods (COGS)",
  "Staff wages",
  "Marketing",
  "Logistics / Delivery",
  "Equipment",
  "Other",
];

const RETAIL_INCOME_CATS = [
  "Product sales",
  "POS sales",
  "Wholesale",
  "Other income",
];

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

export default async function AccountingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Accounting");
  const ctx = await requireOrg(locale);
  const isClinic = ctx.organization.niche === "clinic";

  if (!canAccessSensitive(ctx.membership.role)) {
    redirect({ href: "/dashboard", locale });
  }

  const unlocked = await isSectionUnlocked("accounting");
  if (!unlocked) {
    return (
      <SectionLockGate
        section="accounting"
        title={isClinic ? t("title") : t("titleRetail")}
        subtitle={t("lockSubtitle")}
      />
    );
  }

  const period: AccountingPeriod = isPeriod(sp.period) ? sp.period : "this_month";
  const { startDay, endDay } = accountingPeriodRange(period);

  const supabase = await createClient();
  const incomeCats = isClinic ? CLINIC_INCOME_CATS : RETAIL_INCOME_CATS;
  const expenseCats = isClinic ? CLINIC_EXPENSE_CATS : RETAIL_EXPENSE_CATS;

  const [{ data: expenses }, { data: ledger }, logs] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .gte("expense_date", startDay)
      .lte("expense_date", endDay)
      .order("expense_date", { ascending: false }),
    supabase
      .from("ledger_entries")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .gte("entry_date", startDay)
      .lte("entry_date", endDay)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false }),
    fetchSectionLogs(ctx.organization.id, ["accounting"]),
  ]);

  const income = (ledger || [])
    .filter((e) => e.entry_type === "income")
    .reduce((s, e) => s + Number(e.amount), 0);
  const expenseTotal = (ledger || [])
    .filter((e) => e.entry_type === "expense")
    .reduce((s, e) => s + Number(e.amount), 0);
  const profit = income - expenseTotal;

  const periodLabels: Record<AccountingPeriod, string> = {
    today: t("filterToday"),
    this_week: t("filterThisWeek"),
    this_month: t("filterThisMonth"),
    prev_3_months: t("filterPrev3"),
    prev_6_months: t("filterPrev6"),
    this_year: t("filterThisYear"),
  };

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title={isClinic ? t("title") : t("titleRetail")}
        subtitle={isClinic ? t("subtitle") : t("subtitleRetail")}
      />

      <div className="surface" style={{ padding: "0.9rem 1.1rem" }}>
        <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {t("filter")}:
          </span>
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/accounting?period=${p}`}
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
          <div className="kpi-label">{t("income")}</div>
          <div className="kpi-value">{formatCurrency(income)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("expense")}</div>
          <div className="kpi-value">{formatCurrency(expenseTotal)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("profit")}</div>
          <div className="kpi-value">{formatCurrency(profit)}</div>
        </div>
        <div className="surface kpi">
          <div className="kpi-label">{t("cashFlow")}</div>
          <div className="kpi-value">{formatCurrency(profit)}</div>
        </div>
      </div>

      <div className="fluid-grid">
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("addIncome")}</h3>
          <ActionForm action={createIncomeAction} className="stack">
            <div className="field">
              <label>{t("category")}</label>
              <select name="category" className="select" defaultValue={incomeCats[0]}>
                {incomeCats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("amount")}</label>
              <input name="amount" type="number" step="0.01" required className="input" />
            </div>
            <div className="field">
              <label>{t("date")}</label>
              <input
                name="entry_date"
                type="date"
                className="input"
                defaultValue={formatDayKeyMY()}
              />
            </div>
            <div className="field">
              <label>{t("description")}</label>
              <input name="description" className="input" />
            </div>
            <button type="submit" className="btn btn-primary">
              {t("save")}
            </button>
          </ActionForm>
        </div>

        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("addExpense")}</h3>
          <ActionForm action={createExpenseAction} className="stack">
            <div className="field">
              <label>{t("category")}</label>
              <select name="category" className="select" defaultValue={expenseCats[0]}>
                {expenseCats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("amount")}</label>
              <input name="amount" type="number" step="0.01" required className="input" />
            </div>
            <div className="field">
              <label>{t("date")}</label>
              <input
                name="expense_date"
                type="date"
                className="input"
                defaultValue={formatDayKeyMY()}
              />
            </div>
            <div className="field">
              <label>{t("description")}</label>
              <input name="description" className="input" />
            </div>
            <button type="submit" className="btn btn-primary">
              {t("save")}
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
          title: t("chartTitle"),
          byHour: t("chartByHour"),
          byDay: t("chartByDay"),
          byWeek: t("chartByWeek"),
          byMonth: t("chartByMonth"),
          income: t("income"),
          expense: t("expense"),
          empty: t("emptyLedger"),
        }}
      />

      <div className="fluid-grid">
        <AccountingLedgerTable
          title={t("cashFlowLedger")}
          exportLabel={t("exportCsv")}
          filename={`allvisor-cash-flow-${period}.csv`}
          empty={t("emptyLedger")}
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
            date: t("date"),
            type: t("type"),
            description: t("description"),
            source: t("source"),
            amount: t("amount"),
            recordedAt: t("recordedAt"),
          }}
        />

        <AccountingExpenseTable
          title={t("expenseList")}
          exportLabel={t("exportCsv")}
          filename={`allvisor-expenses-${period}.csv`}
          empty={t("empty")}
          rows={(expenses || []).map((e) => ({
            id: e.id,
            expense_date: e.expense_date,
            category: e.category,
            description: e.description,
            amount: e.amount,
          }))}
          labels={{
            date: t("date"),
            category: t("category"),
            description: t("description"),
            amount: t("amount"),
          }}
        />

        <SectionActivityLog title={t("activity")} logs={logs} pageSize={10} />
      </div>
    </div>
  );
}
