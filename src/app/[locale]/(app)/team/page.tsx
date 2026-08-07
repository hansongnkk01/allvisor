import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOwner } from "@/lib/require-owner";
import { PageHeader } from "@/components/PageHeader";
import { formatDateTime } from "@/lib/utils";
import { staffRoleLabel } from "@/lib/roles";

type MemberRow = {
  id: string;
  role: string;
  job_title: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Owner");
  const { supabase, organization } = await requireOwner(locale);
  const orgId = organization.id;

  const [{ data: members }, { data: logs }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, role, job_title, created_at, profiles(full_name, email)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("activity_logs")
      .select("id, actor_name, action, summary, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const rows: MemberRow[] = (members || []).map((m) => ({
    id: m.id as string,
    role: String(m.role),
    job_title: (m.job_title as string | null) ?? null,
    created_at: m.created_at as string,
    profiles: Array.isArray(m.profiles) ? m.profiles[0] || null : m.profiles,
  }));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("teamTitle")} subtitle={t("teamSubtitle")} />

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
                  {m.profiles?.full_name || m.profiles?.email || "—"}
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
            {(logs || []).map((log) => (
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
