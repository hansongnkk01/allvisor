import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { updateOrgSettingsAction, upgradePlanAction } from "@/app/actions";
import { PLAN_LIMITS } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/lib/types";

const plans: SubscriptionPlan[] = ["free", "starter", "growth", "pro"];

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Settings");
  const ctx = await requireOrg(locale);
  const org = ctx.organization;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <ActionForm action={updateOrgSettingsAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("name")}</label>
              <input name="name" className="input" defaultValue={org.name} required />
            </div>
            <div className="field">
              <label>{t("phone")}</label>
              <input name="phone" className="input" defaultValue={org.phone || ""} />
            </div>
            <div className="field">
              <label>{t("tin")}</label>
              <input name="tin" className="input" defaultValue={org.tin || ""} />
            </div>
            <div className="field">
              <label>{t("sst")}</label>
              <input name="sst_number" className="input" defaultValue={org.sst_number || ""} />
            </div>
          </div>
          <div className="field">
            <label>{t("address")}</label>
            <textarea name="address" className="textarea" defaultValue={org.address || ""} />
          </div>
          <button type="submit" className="btn btn-primary">
            {t("save")}
          </button>
        </ActionForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("upgrade")}</h3>
        <p className="muted">
          {t("plan")}: <strong>{org.subscription_plan}</strong> · {t("status")}:{" "}
          <strong>{org.subscription_status}</strong>
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            marginTop: "1rem",
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan}
              className="surface"
              style={{
                padding: "1rem",
                boxShadow: "none",
                borderColor:
                  org.subscription_plan === plan ? "var(--accent)" : "var(--line)",
              }}
            >
              <div style={{ fontWeight: 700 }}>{PLAN_LIMITS[plan].label}</div>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                Staff {PLAN_LIMITS[plan].staff} · Invoices{" "}
                {PLAN_LIMITS[plan].invoicesPerMonth}/mo
                {PLAN_LIMITS[plan].lhdn ? " · LHDN" : ""}
              </p>
              <form
                action={async () => {
                  "use server";
                  await upgradePlanAction(plan);
                }}
              >
                <button
                  type="submit"
                  className={
                    org.subscription_plan === plan ? "btn btn-soft" : "btn btn-primary"
                  }
                  style={{ width: "100%", marginTop: 8 }}
                  disabled={org.subscription_plan === plan}
                >
                  {org.subscription_plan === plan ? "Current" : "Select"}
                </button>
              </form>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "1rem" }}>
          Billing provider hook ready (Billplz/Stripe). Plan changes are gated in-app for
          soft launch; connect payment later.
        </p>
      </div>
    </div>
  );
}
