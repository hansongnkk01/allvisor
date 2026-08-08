import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { hasCapability, getNicheVocab, vocabLabels } from "@/lib/niches";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import {
  changeAdminPasswordAction,
  getDefaultAdminPasswordHint,
  isAdminUnlocked,
  requestBranchLinkAction,
  respondBranchLinkAction,
  unlockAdminAction,
  updateOrgSettingsAction,
} from "@/app/actions";
import { updateAlertSettingsAction } from "@/app/ops-actions";
import {
  saveNotificationChannelAction,
  setNotificationChannelEnabledAction,
} from "@/app/ops-actions";
import { DataImportPanel } from "@/components/DataImportPanel";
import { InvoiceFormatForm } from "@/components/InvoiceFormatForm";
import { BranchClinicSettings } from "@/components/BranchClinicSettings";
import { ClinicLogoEditor } from "@/components/ClinicLogoEditor";
import { formatDateTime } from "@/lib/utils";
import { defaultAdminPassword } from "@/lib/admin-lock";
import { canManageOrgSettings } from "@/lib/roles";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");
  const ctx = await requireOrg(locale);

  // Any role may reach this page — the manager password gate below is the lock,
  // so a supervisor on a staff account can step in without re-logging.
  const unlocked = await isAdminUnlocked();
  const hint = await getDefaultAdminPasswordHint();
  const canEditOrgSettings = canManageOrgSettings(ctx.membership.role);

  if (!unlocked) {
    return (
      <div className="stack" style={{ gap: "1.25rem" }}>
        <PageHeader title={t("title")} subtitle={t("lockSubtitle")} />
        <div className="surface" style={{ padding: "1.25rem", maxWidth: 480 }}>
          <p className="muted">{t("lockHint")}</p>
          {hint ? (
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              {t("defaultPasswordHelp")}: <code>{hint}</code>
            </p>
          ) : null}
          <ActionForm action={unlockAdminAction} className="stack">
            <div className="field">
              <label>{t("password")}</label>
              <input name="password" type="password" required className="input" />
            </div>
            <button type="submit" className="btn btn-primary">
              {t("unlock")}
            </button>
          </ActionForm>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const orgId = ctx.organization.id;

  const [
    { data: pendingRequests },
    { data: outgoingPending },
  ] = await Promise.all([
    supabase
      .from("branch_link_requests")
      .select("*")
      .eq("to_organization_id", orgId)
      .eq("status", "pending"),
    supabase
      .from("branch_link_requests")
      .select("*")
      .eq("from_organization_id", orgId)
      .eq("status", "pending"),
  ]);
  const org = ctx.organization;
  // The AI supervisor is always on; the ops_brain_enabled column remains in
  // the schema but is no longer consulted. Alert thresholds still come from
  // the org row (migration-safe read).
  const opsBrainEnabled = true;
  let alertSettings = { refund_rate_percent: 8, cash_variance_rm: 20, stock_leak_rm: 100 };
  try {
    const { data: flagRow, error: flagError } = await supabase
      .from("organizations")
      .select("alert_settings")
      .eq("id", org.id)
      .maybeSingle();
    if (!flagError) {
      const raw = (flagRow?.alert_settings || {}) as Record<string, unknown>;
      const num = (value: unknown, fallback: number) =>
        Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
      alertSettings = {
        refund_rate_percent: num(raw.refund_rate_percent, 8),
        cash_variance_rm: num(raw.cash_variance_rm, 20),
        stock_leak_rm: num(raw.stock_leak_rm, 100),
      };
    }
  } catch {
    // keep defaults
  }

  // Notification channels (migration 031). Missing table = empty list.
  type ChannelRow = {
    kind: string;
    target: string;
    enabled: boolean;
    last_sent_at: string | null;
    last_error: string | null;
  };
  let channels: ChannelRow[] = [];
  try {
    const { data: channelRows, error: channelError } = await supabase
      .from("notification_channels")
      .select("kind, target, enabled, last_sent_at, last_error")
      .eq("organization_id", orgId);
    if (!channelError) channels = (channelRows || []) as ChannelRow[];
  } catch {
    channels = [];
  }
  const telegramChannel = channels.find((row) => row.kind === "telegram") ?? null;
  const whatsappChannel = channels.find((row) => row.kind === "whatsapp") ?? null;
  const isClinic = hasCapability(org.niche, "appointments") || hasCapability(org.niche, "allergies");
  const isRetail = hasCapability(org.niche, "pos");
  const vocab = getNicheVocab(org.niche);
  const V = vocabLabels(org.niche, locale);

  // Resolve pending request org names
  const pendingFromIds = (pendingRequests || []).map((r) => r.from_organization_id);
  let pendingNames: Record<string, string> = {};
  if (pendingFromIds.length && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: orgs } = await admin
      .from("organizations")
      .select("id, name")
      .in("id", pendingFromIds);
    pendingNames = Object.fromEntries((orgs || []).map((o) => [o.id, o.name]));
  }

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {(pendingRequests || []).length ? (
        <div className="surface" style={{ padding: "1.25rem", borderColor: "var(--accent)" }}>
          <h3 style={{ marginTop: 0 }}>{t("pendingLinks")}</h3>
          {(pendingRequests || []).map((req) => (
            <div
              key={req.id}
              className="row"
              style={{ marginBottom: 8, justifyContent: "space-between" }}
            >
              <span>
                {t("linkFrom")}:{" "}
                <strong>{pendingNames[req.from_organization_id] || req.from_organization_id}</strong>
              </span>
              <div className="row">
                <form
                  action={async () => {
                    "use server";
                    const fd = new FormData();
                    fd.set("request_id", req.id);
                    fd.set("decision", "approved");
                    await respondBranchLinkAction(fd);
                  }}
                >
                  <button type="submit" className="btn btn-primary">
                    {t("approveLink")}
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    const fd = new FormData();
                    fd.set("request_id", req.id);
                    fd.set("decision", "rejected");
                    await respondBranchLinkAction(fd);
                  }}
                >
                  <button type="submit" className="btn btn-ghost">
                    {t("rejectLink")}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Detection thresholds: leadership tunes what the AI supervisor flags. */}
      {opsBrainEnabled &&
      (hasCapability(org.niche, "pos") ||
        hasCapability(org.niche, "cash_drawer") ||
        hasCapability(org.niche, "inventory")) ? (
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("detectionTitle")}</h3>
          <p className="muted">{t("detectionHint")}</p>
          <ActionForm action={updateAlertSettingsAction} className="stack">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {hasCapability(org.niche, "pos") ? (
                <div className="field">
                  <label>{t("refundRateLabel")}</label>
                  <input
                    name="refund_rate_percent"
                    type="number"
                    min={1}
                    max={100}
                    step={0.5}
                    className="input"
                    defaultValue={alertSettings.refund_rate_percent}
                  />
                </div>
              ) : null}
              {hasCapability(org.niche, "cash_drawer") ? (
                <div className="field">
                  <label>{t("cashVarianceLabel")}</label>
                  <input
                    name="cash_variance_rm"
                    type="number"
                    min={1}
                    step={1}
                    className="input"
                    defaultValue={alertSettings.cash_variance_rm}
                  />
                </div>
              ) : null}
              {hasCapability(org.niche, "inventory") ? (
                <div className="field">
                  <label>{t("stockValueLabel")}</label>
                  <input
                    name="stock_leak_rm"
                    type="number"
                    min={1}
                    step={1}
                    className="input"
                    defaultValue={alertSettings.stock_leak_rm}
                  />
                </div>
              ) : null}
            </div>
            <button type="submit" className="btn btn-soft" style={{ alignSelf: "flex-start" }}>
              {t("saveThresholds")}
            </button>
          </ActionForm>
        </div>
      ) : null}

      {/* Briefing delivery channels: Telegram sends for real, WhatsApp is a copy flow. */}
      {opsBrainEnabled && canEditOrgSettings ? (
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("notifTitle")}</h3>
          <p className="muted">{t("notifHint")}</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <ActionForm action={saveNotificationChannelAction} className="stack">
              <input type="hidden" name="kind" value="telegram" />
              <div className="field">
                <label>{t("telegramTargetLabel")}</label>
                <input
                  name="target"
                  className="input"
                  placeholder="123456:AA…:987654321"
                  defaultValue={telegramChannel?.target || ""}
                  required
                />
              </div>
              <div className="row" style={{ gap: "0.5rem", alignItems: "center" }}>
                <button type="submit" className="btn btn-soft">
                  {t("notifSave")}
                </button>
                {telegramChannel ? (
                  <span className="muted" style={{ fontSize: "0.78rem" }}>
                    {telegramChannel.last_error
                      ? t("notifLastError", { error: telegramChannel.last_error })
                      : telegramChannel.last_sent_at
                        ? t("notifLastSent", {
                            time: formatDateTime(telegramChannel.last_sent_at, locale),
                          })
                        : t("notifNeverSent")}
                  </span>
                ) : null}
              </div>
            </ActionForm>

            <ActionForm action={saveNotificationChannelAction} className="stack">
              <input type="hidden" name="kind" value="whatsapp" />
              <div className="field">
                <label>{t("whatsappTargetLabel")}</label>
                <input
                  name="target"
                  className="input"
                  placeholder="+60123456789"
                  defaultValue={whatsappChannel?.target || ""}
                  required
                />
              </div>
              <div className="row" style={{ gap: "0.5rem", alignItems: "center" }}>
                <button type="submit" className="btn btn-soft">
                  {t("notifSave")}
                </button>
                <span className="muted" style={{ fontSize: "0.78rem" }}>
                  {t("notifWhatsAppNote")}
                </span>
              </div>
            </ActionForm>
          </div>

          {telegramChannel || whatsappChannel ? (
            <div className="row" style={{ gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
              {[telegramChannel, whatsappChannel]
                .filter((row): row is ChannelRow => Boolean(row))
                .map((row) => (
                  <ActionForm key={row.kind} action={setNotificationChannelEnabledAction}>
                    <input type="hidden" name="kind" value={row.kind} />
                    <input type="hidden" name="enabled" value={row.enabled ? "false" : "true"} />
                    <button type="submit" className="btn btn-ghost">
                      {row.enabled
                        ? t("notifDisable", { kind: row.kind })
                        : t("notifEnable", { kind: row.kind })}
                    </button>
                  </ActionForm>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Business identity, billing and the zone password stay with the owner. */}
      {canEditOrgSettings ? (
        <>
      <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>{t("securityTitle")}</h3>
            <p className="muted">
              {t("defaultPasswordHelp")}:{" "}
              <code>
                {org.admin_password_hash
                  ? "(custom)"
                  : defaultAdminPassword(org.name, org.created_at)}
              </code>
            </p>
            <ActionForm action={changeAdminPasswordAction} className="stack" style={{ maxWidth: 360 }}>
              <input
                name="new_password"
                type="password"
                minLength={6}
                required
                className="input"
                placeholder={t("newPassword")}
                autoComplete="new-password"
              />
              <input
                name="confirm_password"
                type="password"
                minLength={6}
                required
                className="input"
                placeholder={t("confirmPassword")}
                autoComplete="new-password"
              />
              <button type="submit" className="btn btn-soft" style={{ alignSelf: "flex-start" }}>
                {t("changePassword")}
              </button>
            </ActionForm>
          </div>

          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>{t("businessSettings")}</h3>
            <p className="muted">{V.businessSettingsHint}</p>
            <ActionForm action={updateOrgSettingsAction} className="stack">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                <div className="field">
                  <label>{t("bizName")}</label>
                  <input name="name" className="input" defaultValue={org.name} required />
                </div>
                <div className="field">
                  <label>{t("bizPhone")}</label>
                  <input name="phone" className="input" defaultValue={org.phone || ""} />
                </div>
                <div className="field">
                  <label>{t("bizTin")}</label>
                  <input name="tin" className="input" defaultValue={org.tin || ""} />
                </div>
                <div className="field">
                  <label>{t("bizSst")}</label>
                  <input name="sst_number" className="input" defaultValue={org.sst_number || ""} />
                </div>
              </div>
              <div className="field">
                <label>{t("bizAddress")}</label>
                <textarea name="address" className="textarea" defaultValue={org.address || ""} />
              </div>
              <button type="submit" className="btn btn-primary">
                {t("saveBusiness")}
              </button>
            </ActionForm>
          </div>

          {/* Hours / service charge for the active branch. Other branches are
              edited by switching to them from the branch bar. */}
          <BranchClinicSettings
            branchId={orgId}
            showHours={vocab.showHours}
            settings={{
              serviceChargePercent: Number(org.service_charge_percent ?? 0),
              openHour: Number(org.clinic_open_hour ?? 0),
              closeHour: Number(org.clinic_close_hour ?? 23),
              closedWeekdays: org.closed_weekdays || [],
            }}
            labels={{
              title: vocab.showHours ? V.hoursTitle : V.chargeTitle,
              hint: vocab.showHours ? V.hoursHint : V.chargeHint,
              serviceChargePercent: t("serviceChargePercent"),
              serviceChargeHint: t("serviceChargeHint"),
              saveServiceCharge: t("saveServiceCharge"),
              openHour: t("openHour"),
              closeHour: t("closeHour"),
              weeklyOff: t("weeklyOff"),
              mon: t("mon"),
              tue: t("tue"),
              wed: t("wed"),
              thu: t("thu"),
              fri: t("fri"),
              sat: t("sat"),
              sun: t("sun"),
              holidayNote: V.holidayNote,
              saveHours: V.saveHours,
            }}
          />

          <ClinicLogoEditor
            initialUrl={org.logo_url}
            initialShape={org.logo_shape === "square" ? "square" : "round"}
            labels={{
              title: V.logoTitle,
              hint: t("logoHint"),
              choose: t("logoChoose"),
              zoom: t("logoZoom"),
              shape: t("logoShape"),
              shapeRound: t("logoShapeRound"),
              shapeSquare: t("logoShapeSquare"),
              previewRound: t("logoPreviewRound"),
              previewSquare: t("logoPreviewSquare"),
              save: t("logoSave"),
              remove: t("logoRemove"),
              saving: t("logoSaving"),
              dragHint: t("logoDragHint"),
            }}
          />

          <InvoiceFormatForm
            orgName={org.name}
            initial={{
              prefix: org.invoice_prefix || "INV",
              nextSeq: org.invoice_next_seq || 1,
              seqDigits: org.invoice_seq_digits || 5,
              pattern: org.invoice_number_pattern || "{PREFIX}-{YYYY}-{SEQ}",
            }}
            labels={{
              title: t("invoiceFormatTitle"),
              hint: t("invoiceFormatHint"),
              prefix: t("invoicePrefix"),
              nextSeq: t("invoiceNextSeq"),
              seqDigits: t("invoiceSeqDigits"),
              pattern: t("invoicePattern"),
              patternHelp: t("invoicePatternHelp"),
              preview: t("invoicePreview"),
              save: t("saveInvoiceFormat"),
            }}
          />
        </>
      ) : null}

          <DataImportPanel
            allowedKinds={
              isRetail
                ? hasCapability(org.niche, "logistics")
                  ? ["patients", "product_categories", "products", "suppliers", "past_sales"]
                  : ["patients", "product_categories", "products", "past_sales"]
                : vocab.niche === "tuition" || vocab.scorecard === "generic"
                  ? (["patients"] as const)
                  : isClinic
                    ? undefined
                    : (["patients"] as const)
            }
            omitRisk={!vocab.showRisk}
            labels={{
              title: t("importTitle"),
              hint: V.importHint,
              steps: t("importSteps"),
              kind: t("importKind"),
              downloadTemplate: t("importDownloadTemplate"),
              chooseFile: t("importChooseFile"),
              preview: t("importPreview"),
              importBtn: t("importBtn"),
              importing: t("importing"),
              patients: V.importPeople,
              products: t("importProducts"),
              productCategories: t("importProductCategories"),
              suppliers: t("importSuppliers"),
              pastSales: t("importPastSales"),
              serviceCategories: t("importServiceCategories"),
              serviceItems: t("importServiceItems"),
              appointments: V.schedule,
              orderHint: V.importOrder,
              noRows: t("importNoRows"),
              success: t("importSuccess"),
              partial: t("importPartial"),
            }}
          />

          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>{t("addBranch")}</h3>
            <p className="muted">{V.addBranchHint}</p>
            <ActionForm action={requestBranchLinkAction} className="row">
              <input
                name="branch_name"
                className="input"
                required
                placeholder={V.branchExample}
                style={{ maxWidth: 320 }}
              />
              <button type="submit" className="btn btn-primary">
                {t("linkBranch")}
              </button>
            </ActionForm>
            {(outgoingPending || []).length ? (
              <p className="muted" style={{ marginTop: 8 }}>
                {t("outgoingPending")}: {(outgoingPending || []).length}
              </p>
            ) : null}
          </div>

    </div>
  );
}
