import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { createExpenseAction, createIncomeAction, isSectionUnlocked } from "@/app/actions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { canAccessSensitive } from "@/lib/roles";
import { SectionLockGate } from "@/components/SectionLockGate";
import { SectionActivityLog } from "@/components/SectionActivityLog";
import { fetchSectionLogs } from "@/lib/section-logs";

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

export default async function AccountingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Accounting");
  const ctx = await requireOrg(locale);

  if (!canAccessSensitive(ctx.membership.role)) {
    redirect({ href: "/dashboard", locale });
  }

  const unlocked = await isSectionUnlocked("accounting");
  if (!unlocked) {
    return (
      <SectionLockGate
        section="accounting"
        title={t("title")}
        subtitle={t("lockSubtitle")}
      />
    );
  }

  const supabase = await createClient();
  const isClinic = ctx.organization.niche === "clinic";

  const [{ data: expenses }, { data: ledger }, logs] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("expense_date", { ascending: false }),
    supabase
      .from("ledger_entries")
      .select("*")
      .eq("organization_id", ctx.organization.id)
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

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

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
              {isClinic ? (
                <select name="category" className="select" defaultValue={CLINIC_INCOME_CATS[0]}>
                  {CLINIC_INCOME_CATS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="category" required className="input" placeholder="Sales / Other" />
              )}
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
                defaultValue={new Date().toISOString().slice(0, 10)}
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
              {isClinic ? (
                <select name="category" className="select" defaultValue={CLINIC_EXPENSE_CATS[0]}>
                  {CLINIC_EXPENSE_CATS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="category" required className="input" placeholder="Rent / Supplies" />
              )}
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
                defaultValue={new Date().toISOString().slice(0, 10)}
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

      <div className="fluid-grid">
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("cashFlowLedger")}</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("type")}</th>
                  <th>{t("description")}</th>
                  <th>{t("source")}</th>
                  <th>{t("amount")}</th>
                  <th>{t("recordedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {(ledger || []).map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.entry_date)}</td>
                    <td>
                      <span className="badge">{e.entry_type}</span>
                    </td>
                    <td>{e.description || "—"}</td>
                    <td>{e.source}</td>
                    <td
                      style={{
                        color: e.entry_type === "income" ? "var(--ok, #0a7)" : "inherit",
                        fontWeight: 600,
                      }}
                    >
                      {e.entry_type === "income" ? "+" : "−"}
                      {formatCurrency(Number(e.amount))}
                    </td>
                    <td>{formatDateTime(e.created_at)}</td>
                  </tr>
                ))}
                {!ledger?.length ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      {t("emptyLedger")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("expenseList")}</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("category")}</th>
                  <th>{t("description")}</th>
                  <th>{t("amount")}</th>
                </tr>
              </thead>
              <tbody>
                {(expenses || []).map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.expense_date)}</td>
                    <td>{e.category}</td>
                    <td>{e.description || "—"}</td>
                    <td>{formatCurrency(Number(e.amount))}</td>
                  </tr>
                ))}
                {!expenses?.length ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      {t("empty")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <SectionActivityLog title={t("activity")} logs={logs} />
      </div>
    </div>
  );
}
