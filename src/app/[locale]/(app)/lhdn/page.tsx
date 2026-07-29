import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { isSectionUnlocked, updateOrgSettingsAction } from "@/app/actions";
import { canUseLhdn } from "@/lib/subscription";
import { formatDateTime } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { canAccessSensitive } from "@/lib/roles";
import { SectionLockGate } from "@/components/SectionLockGate";
import { SectionActivityLog } from "@/components/SectionActivityLog";
import { fetchSectionLogs } from "@/lib/section-logs";

export default async function LhdnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Lhdn");
  const ctx = await requireOrg(locale);

  if (!canAccessSensitive(ctx.membership.role)) {
    redirect({ href: "/dashboard", locale });
  }

  const unlocked = await isSectionUnlocked("lhdn");
  if (!unlocked) {
    return (
      <SectionLockGate section="lhdn" title={t("title")} subtitle={t("lockSubtitle")} />
    );
  }

  const allowed = canUseLhdn(
    ctx.organization.subscription_plan,
    ctx.organization.subscription_status
  );
  const supabase = await createClient();
  const [{ data: submissions }, logs] = await Promise.all([
    supabase
      .from("lhdn_submissions")
      .select("*, invoices(invoice_number)")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false }),
    fetchSectionLogs(ctx.organization.id, ["lhdn"]),
  ]);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="surface" style={{ padding: "1rem 1.25rem" }}>
        <p style={{ margin: 0 }}>
          {process.env.LHDN_CLIENT_ID && process.env.LHDN_CLIENT_SECRET
            ? t("liveConnected")
            : t("demoMode")}
        </p>
      </div>

      {!allowed ? (
        <div className="surface" style={{ padding: "1.25rem" }}>
          <p>{t("lockedPlan")}</p>
          <Link href="/admin" className="btn btn-primary">
            Admin
          </Link>
        </div>
      ) : (
        <div className="surface" style={{ padding: "1.25rem" }}>
          <ActionForm action={updateOrgSettingsAction} className="stack">
            <input type="hidden" name="name" value={ctx.organization.name} />
            <input type="hidden" name="phone" value={ctx.organization.phone || ""} />
            <input type="hidden" name="address" value={ctx.organization.address || ""} />
            <input type="hidden" name="sst_number" value={ctx.organization.sst_number || ""} />
            <div className="field" style={{ maxWidth: 320 }}>
              <label>{t("tin")}</label>
              <input
                name="tin"
                className="input"
                defaultValue={ctx.organization.tin || ""}
                placeholder="C1234567890"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              {t("saveSettings")}
            </button>
          </ActionForm>
        </div>
      )}

      <div className="fluid-grid">
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("submissions")}</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>{t("status")}</th>
                  <th>{t("uuid")}</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {(submissions || []).map((s) => (
                  <tr key={s.id}>
                    <td>{s.invoices?.invoice_number || "—"}</td>
                    <td>
                      <span className="badge">{s.status}</span>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {s.uuid || "—"}
                    </td>
                    <td>{s.submitted_at ? formatDateTime(s.submitted_at) : "—"}</td>
                  </tr>
                ))}
                {!submissions?.length ? (
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
