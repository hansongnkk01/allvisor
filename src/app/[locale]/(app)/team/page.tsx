import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { canAccessAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { formatDayKeyMY } from "@/lib/datetime-my";
import { staffRoleLabel } from "@/lib/roles";

export default async function TeamPage({
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
  const since = formatDayKeyMY(new Date(Date.now() - 6 * 86400000));

  const [membersRes, scoresRes, profilesRes, activityRes] = await Promise.all([
    supabase
      .from("memberships")
      .select("user_id, role, created_at")
      .eq("organization_id", orgId)
      .limit(100),
    supabase
      .from("staff_scores")
      .select("user_id, score, sales_amount, transaction_count, refund_rate, score_date")
      .eq("organization_id", orgId)
      .gte("score_date", since)
      .limit(500),
    supabase.from("profiles").select("id, full_name, email").limit(200),
    supabase
      .from("activity_logs")
      .select("summary, actor_name, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const nameById = new Map(
    (profilesRes.data || []).map((p) => [p.id as string, (p.full_name || p.email || "Staff") as string])
  );

  type Agg = { score: number; sales: number; txn: number; refund: number; days: number };
  const agg = new Map<string, Agg>();
  for (const row of scoresRes.data || []) {
    const key = row.user_id as string;
    const prev = agg.get(key) || { score: 0, sales: 0, txn: 0, refund: 0, days: 0 };
    agg.set(key, {
      score: prev.score + Number(row.score || 0),
      sales: prev.sales + Number(row.sales_amount || 0),
      txn: prev.txn + Number(row.transaction_count || 0),
      refund: prev.refund + Number(row.refund_rate || 0),
      days: prev.days + 1,
    });
  }

  const members = (membersRes.data || [])
    .map((m) => {
      const a = agg.get(m.user_id as string);
      return {
        userId: m.user_id as string,
        name: nameById.get(m.user_id as string) || "Staff",
        role: m.role as string,
        avgScore: a && a.days ? Math.round(a.score / a.days) : null,
        sales: a?.sales ?? 0,
        txn: a?.txn ?? 0,
        refundRate: a && a.days ? a.refund / a.days : 0,
      };
    })
    .sort((x, y) => (y.avgScore ?? -1) - (x.avgScore ?? -1));

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <PageHeader title={t("team")} subtitle={ctx.organization.name} />

      <section className="surface" style={{ padding: "1rem" }}>
        <strong>{tDash("staffRanking")}</strong>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data">
            <thead>
              <tr>
                <th>#</th>
                <th>Staff</th>
                <th>Role</th>
                <th style={{ textAlign: "right" }}>Score (7d avg)</th>
                <th style={{ textAlign: "right" }}>Sales (7d)</th>
                <th style={{ textAlign: "right" }}>Txn</th>
                <th style={{ textAlign: "right" }}>Refund %</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.userId}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{m.name}</strong>
                  </td>
                  <td>{staffRoleLabel(m.role)}</td>
                  <td style={{ textAlign: "right" }}>{m.avgScore ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(m.sales)}</td>
                  <td style={{ textAlign: "right" }}>{m.txn}</td>
                  <td style={{ textAlign: "right" }}>{m.refundRate.toFixed(1)}%</td>
                </tr>
              ))}
              {!members.length ? (
                <tr>
                  <td colSpan={7} className="muted">
                    —
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <strong>{tDash("staffActivity")}</strong>
        <ol className="dash-timeline">
          {(activityRes.data || []).map((a, i) => (
            <li key={i}>
              <span className="dash-timeline-dot" />
              <div>
                <strong>{a.actor_name || "Staff"}</strong> <span>{a.summary}</span>
                <div className="muted" style={{ fontSize: ".75rem" }}>
                  {new Date(a.created_at as string).toLocaleString(locale === "ms" ? "ms-MY" : "en-MY")}
                </div>
              </div>
            </li>
          ))}
          {!activityRes.data?.length ? <li className="muted">{tDash("noActivity")}</li> : null}
        </ol>
      </section>
    </div>
  );
}
