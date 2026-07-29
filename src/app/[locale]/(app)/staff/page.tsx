import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { formatDateTime } from "@/lib/utils";
import { canAccessAdmin } from "@/lib/roles";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Staff");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();

  const { data: activities } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={t("readOnlySubtitle")} />

      {canAccessAdmin(ctx.membership.role) ? (
        <div className="surface" style={{ padding: "1rem 1.25rem" }}>
          <p style={{ margin: 0 }}>
            {t("manageInAdmin")}{" "}
            <Link href="/admin" className="btn btn-soft" style={{ marginLeft: 8 }}>
              Admin
            </Link>
          </p>
        </div>
      ) : null}

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("activity")}</h3>
        <div className="stack" style={{ gap: "0.65rem" }}>
          {(activities || []).map((a) => (
            <div
              key={a.id}
              style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}
            >
              <div>
                <strong>{a.actor_name || "Staff"}</strong>
                <span className="muted"> · {a.summary}</span>
              </div>
              <div className="muted" style={{ fontSize: "0.8rem" }}>
                {formatDateTime(a.created_at)} · {a.action}
              </div>
            </div>
          ))}
          {!activities?.length ? <p className="muted">{t("noActivity")}</p> : null}
        </div>
      </div>
    </div>
  );
}
