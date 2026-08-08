import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOwner } from "@/lib/require-owner";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ScoreBar } from "@/components/dashboards/ScoreBar";
import { TeamMembersSection } from "@/components/TeamMembersSection";
import { recalculateStaffScoresAction } from "@/app/actions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { formatDayKeyMY } from "@/lib/datetime-my";
import { assignableStaffRoles, kickableStaffRoles, staffRoleLabel } from "@/lib/roles";
import { vocabLabels } from "@/lib/niches";
import type { MembershipRole } from "@/lib/types";

type MemberRow = {
  id: string;
  userId: string;
  role: string;
  job_title: string | null;
  created_at: string;
  name: string;
};

const SCORE_WINDOW_DAYS = 30;

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Owner");
  const tAdmin = await getTranslations("Admin");
  const { supabase, organization, membership, profile } = await requireOwner(locale);
  const orgId = organization.id;
  const V = vocabLabels(organization.niche, locale);

  const now = new Date();
  const windowStart = formatDayKeyMY(new Date(now.getTime() - SCORE_WINDOW_DAYS * 86400000));

  const [{ data: members }, { data: logs }, { data: scores }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, user_id, role, job_title, created_at, profiles(full_name, email)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("activity_logs")
      .select("id, actor_id, actor_name, action, summary, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("staff_scores")
      .select(
        "user_id, score_date, score, sales_amount, transaction_count, average_basket, refund_count, void_count"
      )
      .eq("organization_id", orgId)
      .gte("score_date", windowStart),
  ]);

  const rows: MemberRow[] = (members || []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id as string,
      userId: String(m.user_id),
      role: String(m.role),
      job_title: (m.job_title as string | null) ?? null,
      created_at: m.created_at as string,
      name: profile?.full_name || profile?.email || "—",
    };
  });

  // Average the daily scores so one busy Saturday does not define a person.
  const scoreByUser = new Map<
    string,
    { days: number; total: number; sales: number; transactions: number; refunds: number; voids: number }
  >();
  for (const row of scores || []) {
    const key = String(row.user_id);
    const entry = scoreByUser.get(key) || {
      days: 0,
      total: 0,
      sales: 0,
      transactions: 0,
      refunds: 0,
      voids: 0,
    };
    entry.days += 1;
    entry.total += Number(row.score || 0);
    entry.sales += Number(row.sales_amount || 0);
    entry.transactions += Number(row.transaction_count || 0);
    entry.refunds += Number(row.refund_count || 0);
    entry.voids += Number(row.void_count || 0);
    scoreByUser.set(key, entry);
  }

  const actionCountByUser = new Map<string, number>();
  for (const log of logs || []) {
    if (!log.actor_id) continue;
    const key = String(log.actor_id);
    actionCountByUser.set(key, (actionCountByUser.get(key) || 0) + 1);
  }

  const ranked = rows
    .map((member) => {
      const entry = scoreByUser.get(member.userId);
      const percent = entry && entry.days > 0 ? Math.round(entry.total / entry.days) : null;
      return {
        member,
        percent,
        sales: entry?.sales || 0,
        transactions: entry?.transactions || 0,
        mistakes: (entry?.refunds || 0) + (entry?.voids || 0),
        actions: actionCountByUser.get(member.userId) || 0,
      };
    })
    .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));

  const hasScores = (scores || []).length > 0;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("teamTitle")} subtitle={t("teamSubtitle")} />

      {/* Add / remove members — moved here from the Admin tab. */}
      <TeamMembersSection
        branchId={orgId}
        isOwnBranch
        currentUserId={membership.user_id || profile.id}
        assignableRoles={assignableStaffRoles(membership.role)}
        kickableRoles={kickableStaffRoles(membership.role)}
        defaultOpen
        members={(members || []).map((m) => {
          const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          return {
            id: m.id as string,
            user_id: String(m.user_id),
            role: String(m.role) as MembershipRole,
            job_title: (m.job_title as string | null) ?? null,
            profiles: p ? { full_name: p.full_name, email: p.email } : null,
          };
        })}
        labels={{
          title: tAdmin("staffTitle"),
          hint: V.addMemberHint,
          username: tAdmin("staffUsername"),
          name: tAdmin("staffName"),
          password: tAdmin("staffPassword"),
          passwordHint: tAdmin("staffPasswordHint"),
          role: tAdmin("staffRole"),
          jobTitle: tAdmin("jobTitle"),
          jobTitlePlaceholder: V.staffHint,
          add: tAdmin("addStaff"),
          search: tAdmin("searchStaff"),
          email: tAdmin("staffEmail"),
          kickCol: tAdmin("kickStaff"),
          kick: tAdmin("kick"),
        }}
      />

      <section className="surface" style={{ padding: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>{t("scoreTitle")}</h2>
          <ActionForm action={recalculateStaffScoresAction}>
            <button type="submit" className="btn btn-soft">
              {t("recalculate")}
            </button>
          </ActionForm>
        </div>
        <p className="muted">{t("scoreHint", { days: SCORE_WINDOW_DAYS })}</p>
        <table className="table">
          <thead>
            <tr>
              <th>{t("teamMember")}</th>
              <th>{t("scoreColumn")}</th>
              <th>{t("salesColumn")}</th>
              <th>{t("transactionsLabel")}</th>
              <th>{t("mistakesColumn")}</th>
              <th>{t("actionsColumn")}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => (
              <tr key={row.member.id}>
                <td>
                  {row.member.name}
                  <div className="muted">{staffRoleLabel(row.member.role)}</div>
                </td>
                <td style={{ minWidth: 140 }}>
                  {row.percent === null ? (
                    <span className="muted">—</span>
                  ) : (
                    <ScoreBar percent={row.percent} />
                  )}
                </td>
                <td>{formatCurrency(row.sales)}</td>
                <td>{row.transactions}</td>
                <td>{row.mistakes}</td>
                <td>{row.actions}</td>
              </tr>
            ))}
            {ranked.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  {t("teamEmpty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {!hasScores ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            {t("scoreEmpty")}
          </p>
        ) : null}
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("teamMembers")}</h2>
        <table className="table">
          <thead>
            <tr>
              <th>{t("teamMember")}</th>
              <th>{t("teamRole")}</th>
              <th>{t("teamJoined")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.name}
                  {m.job_title ? <div className="muted">{m.job_title}</div> : null}
                </td>
                <td>{staffRoleLabel(m.role)}</td>
                <td>{formatDateTime(m.created_at, locale)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  {t("teamEmpty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{t("activityTitle")}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {t("activitySubtitle")}
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>{t("activityWho")}</th>
              <th>{t("activityWhat")}</th>
              <th>{t("activityWhen")}</th>
            </tr>
          </thead>
          <tbody>
            {(logs || []).slice(0, 50).map((log) => (
              <tr key={log.id as string}>
                <td>{(log.actor_name as string) || "—"}</td>
                <td>{log.summary as string}</td>
                <td>{formatDateTime(log.created_at as string, locale)}</td>
              </tr>
            ))}
            {!logs?.length ? (
              <tr>
                <td colSpan={3} className="muted">
                  {t("activityEmpty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
