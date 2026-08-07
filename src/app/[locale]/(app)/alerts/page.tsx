import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { updateAlertStatusAction, autoHandleLowAlertAction } from "@/app/ops-brain-actions";
import { canAccessAdmin } from "@/lib/roles";
import { isOpsBrainEnabled } from "@/lib/ops-brain/enabled";
import { Link } from "@/i18n/navigation";

export default async function AlertsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");
  const ctx = await requireOrg(locale);
  const isAdmin = canAccessAdmin(ctx.membership.role);

  if (!isOpsBrainEnabled(ctx.organization)) {
    return (
      <div className="stack">
        <PageHeader title={t("alertsInbox")} subtitle={ctx.organization.name} />
        <p className="muted">Ops Brain is off. Enable it in Admin.</p>
        {isAdmin ? (
          <Link href="/admin" className="btn btn-primary">
            Admin
          </Link>
        ) : null}
      </div>
    );
  }

  const supabase = await createClient();
  let q = supabase
    .from("alerts")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .in("status", ["open", "investigating", "auto_handled"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (!isAdmin) q = q.neq("severity", "high");
  const { data: alerts } = await q;

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader title={t("alertsInbox")} subtitle={ctx.organization.name} />
      <div className="surface" style={{ padding: "1rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Title</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(alerts || []).map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="badge">{a.severity}</span>
                  </td>
                  <td>
                    <strong>{a.title}</strong>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {a.message}
                    </div>
                  </td>
                  <td>{a.status}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                      <ActionForm action={updateAlertStatusAction}>
                        <input type="hidden" name="alert_id" value={a.id} />
                        <input type="hidden" name="status" value="investigating" />
                        <button type="submit" className="btn btn-ghost" style={{ fontSize: "0.75rem" }}>
                          Investigating
                        </button>
                      </ActionForm>
                      <ActionForm action={updateAlertStatusAction}>
                        <input type="hidden" name="alert_id" value={a.id} />
                        <input type="hidden" name="status" value="resolved" />
                        <button type="submit" className="btn btn-ghost" style={{ fontSize: "0.75rem" }}>
                          Resolve
                        </button>
                      </ActionForm>
                      {isAdmin && a.severity === "low" && a.status === "open" ? (
                        <ActionForm action={autoHandleLowAlertAction}>
                          <input type="hidden" name="alert_id" value={a.id} />
                          <button type="submit" className="btn btn-soft" style={{ fontSize: "0.75rem" }}>
                            Auto-task
                          </button>
                        </ActionForm>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!alerts?.length ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No open alerts
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
