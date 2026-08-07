import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { vocabLabels } from "@/lib/niches";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { isSectionUnlocked, updateOrgSettingsAction } from "@/app/actions";
import { canUseLhdn } from "@/lib/subscription";
import { formatDateTime } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { canAccessSensitive, canManageOrgSettings } from "@/lib/roles";
import { SectionLockGate } from "@/components/SectionLockGate";
import { SectionActivityLog } from "@/components/SectionActivityLog";
import { fetchSectionLogs } from "@/lib/section-logs";
import { displayLhdnStatus, getLhdnMode } from "@/lib/lhdn";
import { LhdnSubmissionsTable } from "@/components/LhdnSubmissionsTable";

export default async function LhdnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Lhdn");
  const tNav = await getTranslations("Nav");
  const ctx = await requireOrg(locale);
  const V = vocabLabels(ctx.organization.niche, locale);

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
  const mode = getLhdnMode();
  const platformName =
    process.env.LHDN_INTERMEDIARY_NAME?.trim() || "Allvisor";
  const supabase = await createClient();
  const [{ data: submissions }, logs] = await Promise.all([
    supabase
      .from("lhdn_submissions")
      .select("*, invoices(invoice_number)")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false }),
    fetchSectionLogs(ctx.organization.id, ["lhdn"], 50),
  ]);

  const linked = Boolean(ctx.organization.lhdn_intermediary_linked);

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={V.lhdnSubtitle} />

      <div className="surface" style={{ padding: "1rem 1.25rem" }}>
        <p style={{ margin: 0 }}>
          {mode === "demo"
            ? t("demoMode")
            : mode === "intermediary"
              ? V.lhdnIntermediary.replace("{name}", platformName)
              : t("liveConnected")}
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
        <>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>{V.lhdnHowTitle}</h3>
            <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", lineHeight: 1.55 }}>
              <li>{t("howStep1")}</li>
              <li>{t("howStep2", { name: platformName })}</li>
              <li>{t("howStep3", { name: platformName })}</li>
              <li>{t("howStep4")}</li>
            </ol>
            <p className="muted" style={{ margin: "0.75rem 0 0", fontSize: "0.9rem" }}>
              {t("howNote", { name: platformName })}
            </p>
          </div>

          {/* The tax identity belongs to the owner, so managers see it read-only. */}
          <div className="surface" style={{ padding: "1.25rem" }}>
            {canManageOrgSettings(ctx.membership.role) ? (
            <ActionForm action={updateOrgSettingsAction} className="stack">
              <input type="hidden" name="name" value={ctx.organization.name} />
              <input type="hidden" name="phone" value={ctx.organization.phone || ""} />
              <input type="hidden" name="address" value={ctx.organization.address || ""} />
              <input type="hidden" name="sst_number" value={ctx.organization.sst_number || ""} />
              <input type="hidden" name="lhdn_link_present" value="1" />
              <div className="field" style={{ maxWidth: 320 }}>
                <label>{t("tin")}</label>
                <input
                  name="tin"
                  className="input"
                  defaultValue={ctx.organization.tin || ""}
                  placeholder="C1234567890"
                  required
                />
              </div>
              <div className="field" style={{ maxWidth: 320 }}>
                <label>{t("brn")}</label>
                <input
                  name="lhdn_brn"
                  className="input"
                  defaultValue={ctx.organization.lhdn_brn || ""}
                  placeholder={t("brnPlaceholder")}
                />
                <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
                  {t("brnHelp")}
                </p>
              </div>
              <label
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "flex-start",
                  maxWidth: 520,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name="lhdn_intermediary_linked"
                  value="1"
                  defaultChecked={linked}
                  style={{ marginTop: "0.2rem" }}
                />
                <span>
                  {t("linkedConfirm", { name: platformName })}
                  {linked && ctx.organization.lhdn_intermediary_linked_at ? (
                    <span className="muted" style={{ display: "block", fontSize: "0.85rem" }}>
                      {t("linkedAt", {
                        date: formatDateTime(ctx.organization.lhdn_intermediary_linked_at),
                      })}
                    </span>
                  ) : null}
                </span>
              </label>
              <button type="submit" className="btn btn-primary">
                {t("saveSettings")}
              </button>
            </ActionForm>
            ) : (
              <div className="stack" style={{ gap: "0.5rem" }}>
                <div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {t("tin")}
                  </div>
                  <div style={{ fontWeight: 600 }}>{ctx.organization.tin || "—"}</div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    {t("brn")}
                  </div>
                  <div style={{ fontWeight: 600 }}>{ctx.organization.lhdn_brn || "—"}</div>
                </div>
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  {tNav("ownerOnlyHint")}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("submissions")}</h3>
        <LhdnSubmissionsTable
          empty={t("empty")}
          refreshLabel={t("refreshStatus")}
          columns={{
            invoice: "Invoice",
            status: t("status"),
            uuid: t("uuid"),
            submitted: "Submitted",
            detail: t("detail"),
          }}
          rows={(submissions || []).map((s) => {
            const resp = (s.response || {}) as Record<string, unknown>;
            const myStatus =
              typeof resp.myinvoisStatus === "string" ? resp.myinvoisStatus : null;
            const detail =
              (typeof resp.validationSummary === "string" && resp.validationSummary) ||
              (typeof resp.message === "string" && resp.message) ||
              (typeof resp.error === "string" && resp.error) ||
              (Array.isArray(resp.rejectedDocuments)
                ? JSON.stringify(resp.rejectedDocuments).slice(0, 180)
                : null) ||
              "—";
            return {
              id: s.id,
              invoiceLabel: s.invoices?.invoice_number || "—",
              statusLabel: displayLhdnStatus(s.status, myStatus),
              uuid: s.uuid,
              submittedAt: s.submitted_at ? formatDateTime(s.submitted_at) : "—",
              detail,
              invoiceId: s.invoice_id,
              canRefresh: Boolean(s.invoice_id && s.uuid),
            };
          })}
        />
      </div>

      <SectionActivityLog title={t("activity")} logs={logs} pageSize={5} />
    </div>
  );
}
