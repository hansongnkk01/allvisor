import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { canAccessAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { formatDayKeyMY } from "@/lib/datetime-my";

function monthKey(offset: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return formatDayKeyMY(d).slice(0, 7);
}

export default async function CashflowPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireOrg(locale);

  if (!canAccessAdmin(ctx.membership.role)) {
    redirect({ href: "/staff-dashboard", locale });
  }

  const t = await getTranslations("Nav");
  const tDash = await getTranslations("Dashboard");
  const supabase = await createClient();
  const orgId = ctx.organization.id;
  const fromMonth = `${monthKey(-5)}-01`;

  const [ledgerRes, unpaidRes] = await Promise.all([
    supabase
      .from("ledger_entries")
      .select("entry_type, amount, entry_date, category")
      .eq("organization_id", orgId)
      .gte("entry_date", fromMonth)
      .limit(5000),
    supabase
      .from("invoices")
      .select("total, amount_paid, issue_date, created_at, due_date")
      .eq("organization_id", orgId)
      .in("status", ["unpaid", "partial"])
      .limit(1000),
  ]);

  const months: Array<{ key: string; income: number; expense: number }> = [];
  for (let i = -5; i <= 0; i += 1) {
    months.push({ key: monthKey(i), income: 0, expense: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  const expenseByCategory = new Map<string, number>();

  for (const e of ledgerRes.data || []) {
    const key = String(e.entry_date).slice(0, 7);
    const bucket = byKey.get(key);
    const amount = Number(e.amount || 0);
    if (bucket) {
      if (e.entry_type === "income") bucket.income += amount;
      else bucket.expense += amount;
    }
    if (e.entry_type === "expense" && key === monthKey(0)) {
      const cat = String(e.category || "other");
      expenseByCategory.set(cat, (expenseByCategory.get(cat) || 0) + amount);
    }
  }

  const closed = months.slice(0, 5);
  const avgIncome = closed.reduce((s, m) => s + m.income, 0) / Math.max(1, closed.length);
  const avgExpense = closed.reduce((s, m) => s + m.expense, 0) / Math.max(1, closed.length);
  const projectedNet = avgIncome - avgExpense;
  const thisMonth = months[months.length - 1];
  const net = thisMonth.income - thisMonth.expense;
  const burnPerDay = thisMonth.expense / 30;
  const runwayDays = burnPerDay > 0 ? Math.max(0, Math.round(net / burnPerDay)) : null;

  const now = Date.now();
  const buckets = { d0: 0, d30: 0, d60: 0, d90: 0 };
  for (const inv of unpaidRes.data || []) {
    const outstanding = Math.max(0, Number(inv.total) - Number(inv.amount_paid || 0));
    const issued = new Date((inv.issue_date as string) || (inv.created_at as string)).getTime();
    const age = (now - issued) / 86400000;
    if (age <= 30) buckets.d0 += outstanding;
    else if (age <= 60) buckets.d30 += outstanding;
    else if (age <= 90) buckets.d60 += outstanding;
    else buckets.d90 += outstanding;
  }

  const peak = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense)));
  const topExpenses = [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader title={t("cashflow")} subtitle={ctx.organization.name} />

      <section className="dash-admin-strip">
        <div className="surface dash-stat">
          <span className="kpi-label">{tDash("incomeLabel")}</span>
          <strong className="kpi-value">{formatCurrency(thisMonth.income)}</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">{tDash("expenseLabel")}</span>
          <strong className="kpi-value">{formatCurrency(thisMonth.expense)}</strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">{tDash("netLabel")}</span>
          <strong
            className="kpi-value"
            style={{ color: net >= 0 ? "var(--success, #16a34a)" : "var(--danger)" }}
          >
            {formatCurrency(net)}
          </strong>
        </div>
        <div className="surface dash-stat">
          <span className="kpi-label">{tDash("runway")}</span>
          <strong className="kpi-value">{runwayDays === null ? "—" : `${runwayDays}d`}</strong>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            projected net: {formatCurrency(projectedNet)}
          </span>
        </div>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <strong>Income vs expense — last 6 months</strong>
        <div className="dash-trend">
          {months.map((m) => (
            <div key={m.key} className="dash-trend-col">
              <div
                style={{ display: "flex", gap: 3, alignItems: "flex-end", width: "100%", height: "100%" }}
              >
                <div
                  className="dash-trend-bar"
                  title={`${tDash("incomeLabel")}: ${formatCurrency(m.income)}`}
                  style={{ height: `${Math.round((m.income / peak) * 100)}%` }}
                />
                <div
                  className="dash-trend-bar"
                  title={`${tDash("expenseLabel")}: ${formatCurrency(m.expense)}`}
                  style={{
                    height: `${Math.round((m.expense / peak) * 100)}%`,
                    background: "var(--danger, #dc2626)",
                    opacity: 0.65,
                  }}
                />
              </div>
              <span className="dash-trend-label">{m.key.slice(2)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="fluid-grid">
        <section className="surface" style={{ padding: "1rem" }}>
          <strong>Receivables ageing</strong>
          <dl className="dash-figures">
            <div>
              <dt>0–30d</dt>
              <dd>{formatCurrency(buckets.d0)}</dd>
            </div>
            <div>
              <dt>31–60d</dt>
              <dd>{formatCurrency(buckets.d30)}</dd>
            </div>
            <div>
              <dt>61–90d</dt>
              <dd>{formatCurrency(buckets.d60)}</dd>
            </div>
            <div>
              <dt>90d+</dt>
              <dd style={{ color: buckets.d90 > 0 ? "var(--danger)" : undefined }}>
                {formatCurrency(buckets.d90)}
              </dd>
            </div>
          </dl>
          <Link href="/invoices" className="btn btn-ghost" style={{ marginTop: 10 }}>
            {tDash("invoicesLink")}
          </Link>
        </section>

        <section className="surface" style={{ padding: "1rem" }}>
          <strong>Top expense categories (this month)</strong>
          {topExpenses.length ? (
            <table className="data" style={{ marginTop: 10 }}>
              <tbody>
                {topExpenses.map(([cat, amount]) => (
                  <tr key={cat}>
                    <td>{cat}</td>
                    <td style={{ textAlign: "right" }}>{formatCurrency(amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">—</p>
          )}
          <Link href="/accounting" className="btn btn-soft" style={{ marginTop: 10 }}>
            {tDash("accountingLink")}
          </Link>
        </section>
      </div>
    </div>
  );
}
