import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import {
  addCashMovementAction,
  closeCashSessionAction,
  openCashSessionAction,
} from "@/app/retail-actions";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function CashPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("RetailPages");
  const ctx = await requireOrg(locale);
  if (ctx.organization.niche !== "retail") redirect({ href: "/dashboard", locale });
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("cash_sessions")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("opened_at", { ascending: false })
    .limit(30);
  const openSession = (sessions || []).find((session) => session.status === "open");
  const { data: movements } = openSession
    ? await supabase
        .from("cash_movements")
        .select("*")
        .eq("session_id", openSession.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const expected = (movements || []).reduce((sum, movement) => {
    const amount = Number(movement.amount);
    return sum + (movement.type === "out" || movement.type === "refund" ? -amount : amount);
  }, 0);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("cashTitle")} subtitle={t("cashSubtitle")} />
      {!openSession ? (
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>Open cash session</h3>
          <ActionForm action={openCashSessionAction} className="row">
            <div className="field"><label>Opening float</label><input className="input" name="opening_float" type="number" min="0" step=".01" defaultValue="0" /></div>
            <button className="btn btn-primary" type="submit">Open drawer</button>
          </ActionForm>
        </div>
      ) : (
        <>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <div><h3 style={{ margin: 0 }}>Open session</h3><p className="muted">Opened by {openSession.opened_by_name || "Staff"} · {formatDateTime(openSession.opened_at)}</p></div>
              <div style={{ textAlign: "right" }}><div className="muted">Expected cash</div><strong style={{ fontSize: "1.5rem" }}>{formatCurrency(expected)}</strong></div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
            <div className="surface" style={{ padding: "1.25rem" }}>
              <h3 style={{ marginTop: 0 }}>Cash in / out</h3>
              <ActionForm action={addCashMovementAction} className="stack">
                <input type="hidden" name="session_id" value={openSession.id} />
                <select className="select" name="type"><option value="in">Cash in</option><option value="out">Cash out</option></select>
                <input className="input" name="amount" type="number" min=".01" step=".01" required placeholder="Amount" />
                <input className="input" name="note" required placeholder="Reason / note" />
                <button className="btn btn-primary" type="submit">Record movement</button>
              </ActionForm>
            </div>
            <div className="surface" style={{ padding: "1.25rem" }}>
              <h3 style={{ marginTop: 0 }}>Close & reconcile</h3>
              <ActionForm action={closeCashSessionAction} className="stack">
                <input type="hidden" name="session_id" value={openSession.id} />
                <input type="hidden" name="expected_cash" value={expected} />
                <div className="field"><label>Counted cash</label><input className="input" name="closing_count" type="number" min="0" step=".01" required /></div>
                <textarea className="input" name="notes" placeholder="Closing notes" />
                <button className="btn btn-ghost" type="submit">Close session</button>
              </ActionForm>
            </div>
          </div>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Current movements</h3>
            <div className="table-wrap"><table className="data">
              <thead><tr><th>Time</th><th>Type</th><th>Note</th><th>Staff</th><th>Amount</th></tr></thead>
              <tbody>{(movements || []).map((movement) => (
                <tr key={movement.id}><td>{formatDateTime(movement.created_at)}</td><td>{movement.type}</td><td>{movement.note || "—"}</td><td>{movement.created_by_name || "—"}</td><td>{formatCurrency(Number(movement.amount))}</td></tr>
              ))}</tbody>
            </table></div>
          </div>
        </>
      )}
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>Session history</h3>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>Opened</th><th>Staff</th><th>Status</th><th>Expected</th><th>Counted</th><th>Variance</th></tr></thead>
          <tbody>{(sessions || []).map((session) => (
            <tr key={session.id}><td>{formatDateTime(session.opened_at)}</td><td>{session.opened_by_name || "—"}</td><td><span className="badge">{session.status}</span></td><td>{session.expected_cash == null ? "—" : formatCurrency(Number(session.expected_cash))}</td><td>{session.closing_count == null ? "—" : formatCurrency(Number(session.closing_count))}</td><td>{session.variance == null ? "—" : formatCurrency(Number(session.variance))}</td></tr>
          ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}
