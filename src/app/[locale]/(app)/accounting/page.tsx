import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { createExpenseAction } from "@/app/actions";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AccountingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Accounting");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();

  const [{ data: expenses }, { data: ledger }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("expense_date", { ascending: false }),
    supabase
      .from("ledger_entries")
      .select("*")
      .eq("organization_id", ctx.organization.id),
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
      <PageHeader title={t("title")} />

      <div className="grid-kpi">
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
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("addExpense")}</h3>
        <ActionForm action={createExpenseAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("category")}</label>
              <input name="category" required className="input" placeholder="Rent / Supplies" />
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
    </div>
  );
}
