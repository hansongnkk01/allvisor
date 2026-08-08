import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { isSectionUnlocked } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { SectionLockGate } from "@/components/SectionLockGate";
import { SeverityChip } from "@/components/dashboards/OpsCards";
import { setAlertStatusAction } from "@/app/ops-actions";
import { formatDateTime } from "@/lib/utils";
import type { AlertRow } from "@/lib/dashboard-data";

const FILTERS = ["all", "open", "investigating", "resolved"] as const;
type Filter = (typeof FILTERS)[number];

function isFilter(value: string): value is Filter {
  return (FILTERS as readonly string[]).includes(value);
}

export default async function AlertsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Alerts");
  const tOwner = await getTranslations("Owner");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();

  // The alert queue sits inside the Manager Zone: any role may reach this page,
  // but the zone password must be unlocked first — same gate as Admin,
  // Accounting and LHDN.
  const unlocked = await isSectionUnlocked("admin");
  if (!unlocked) {
    return (
      <SectionLockGate section="admin" title={t("pageTitle")} subtitle={t("lockSubtitle")} />
    );
  }

  const query = await searchParams;
  const raw = Array.isArray(query.status) ? query.status[0] : query.status || "all";
  const filter: Filter = isFilter(raw) ? raw : "all";

  let select = supabase
    .from("alerts")
    .select("id, type, severity, title, message, status, created_at, related_staff_id, metadata")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter !== "all") select = select.eq("status", filter);

  // Soft-fail: migration 029 pending renders an empty page, never a crash.
  let rows: (AlertRow & { autoHandled: boolean })[] = [];
  try {
    const { data } = await select;
    const staffIds = ((data || []) as Record<string, unknown>[])
      .map((row) => row.related_staff_id as string | null)
      .filter((id): id is string => Boolean(id));
    const names = new Map<string, string>();
    if (staffIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", [...new Set(staffIds)]);
      for (const profile of profiles || []) {
        names.set(
          String(profile.id),
          (profile.full_name as string | null) || (profile.email as string | null) || "—"
        );
      }
    }
    rows = ((data || []) as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      type: row.type as string,
      severity: row.severity as AlertRow["severity"],
      title: row.title as string,
      message: row.message as string,
      status: row.status as AlertRow["status"],
      staffName: row.related_staff_id
        ? names.get(String(row.related_staff_id)) ?? null
        : null,
      created_at: row.created_at as string,
      autoHandled:
        Boolean(row.metadata) &&
        (row.metadata as Record<string, unknown>).auto_handled === true,
    }));
  } catch {
    rows = [];
  }

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} />

      <div className="row" style={{ gap: "0.4rem", flexWrap: "wrap" }}>
        {FILTERS.map((value) => (
          <Link
            key={value}
            href={value === "all" ? "/alerts" : `/alerts?status=${value}`}
            className={filter === value ? "btn btn-soft" : "btn btn-ghost"}
          >
            {t(`filter.${value}`)}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <section className="surface" style={{ padding: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>{t("emptyTitle")}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            {t("emptyBody")}
          </p>
        </section>
      ) : (
        <div className="stack" style={{ gap: "0.55rem" }}>
          {rows.map((alert) => (
            <section key={alert.id} className="surface" style={{ padding: "0.85rem 1rem" }}>
              <div className="row" style={{ gap: "0.45rem", alignItems: "center" }}>
                <SeverityChip severity={alert.severity} />
                <strong style={{ flex: 1, minWidth: 0 }}>{alert.title}</strong>
                {alert.status !== "open" ? (
                  <span className="muted" style={{ fontSize: "0.75rem", fontStyle: "italic" }}>
                    {tOwner(`alertStatus.${alert.status}`)}
                  </span>
                ) : null}
                {alert.autoHandled ? (
                  <span className="muted" style={{ fontSize: "0.75rem", fontStyle: "italic" }}>
                    {t("autoHandled")}
                  </span>
                ) : null}
              </div>
              <p className="muted" style={{ margin: "0.3rem 0 0", fontSize: "0.86rem" }}>
                {alert.message}
              </p>
              <div
                className="row"
                style={{
                  marginTop: "0.45rem",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <span className="muted" style={{ fontSize: "0.78rem" }}>
                  {alert.staffName ? `${alert.staffName} · ` : ""}
                  {formatDateTime(alert.created_at, locale)}
                </span>
                {alert.status !== "resolved" ? (
                  <span className="row" style={{ gap: "0.35rem" }}>
                    {alert.status === "open" ? (
                      <ActionForm action={setAlertStatusAction} style={{ margin: 0 }}>
                        <input type="hidden" name="alert_id" value={alert.id} />
                        <input type="hidden" name="status" value="investigating" />
                        <button type="submit" className="btn btn-ghost" style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}>
                          {tOwner("markInvestigating")}
                        </button>
                      </ActionForm>
                    ) : null}
                    <ActionForm action={setAlertStatusAction} style={{ margin: 0 }}>
                      <input type="hidden" name="alert_id" value={alert.id} />
                      <input type="hidden" name="status" value="resolved" />
                      <button type="submit" className="btn btn-soft" style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}>
                        {tOwner("markResolved")}
                      </button>
                    </ActionForm>
                  </span>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
