import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import {
  changeAdminPasswordAction,
  deleteServiceCategoryAction,
  deleteServiceItemAction,
  isAdminUnlocked,
  unlockAdminAction,
  upgradePlanAction,
  upsertServiceCategoryAction,
  upsertServiceItemAction,
  getDefaultAdminPasswordHint,
} from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import { PLAN_LIMITS } from "@/lib/subscription";
import { defaultAdminPassword } from "@/lib/admin-lock";
import type { SubscriptionPlan } from "@/lib/types";

const plans: SubscriptionPlan[] = ["free", "starter", "growth", "pro"];

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");
  const ctx = await requireOrg(locale);
  const unlocked = await isAdminUnlocked();
  const hint = await getDefaultAdminPasswordHint();

  if (!unlocked) {
    return (
      <div className="stack" style={{ gap: "1.25rem" }}>
        <PageHeader title={t("title")} subtitle={t("lockSubtitle")} />
        <div className="surface" style={{ padding: "1.25rem", maxWidth: 480 }}>
          <p className="muted">{t("lockHint")}</p>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            {t("defaultPasswordHelp")}: <code>{hint}</code>
          </p>
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
  const [{ data: categories }, { data: services }] = await Promise.all([
    supabase
      .from("service_categories")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("name"),
    supabase
      .from("service_items")
      .select("*, service_categories(name)")
      .eq("organization_id", ctx.organization.id)
      .order("name"),
  ]);

  const org = ctx.organization;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

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
        <ActionForm action={changeAdminPasswordAction} className="row">
          <input
            name="new_password"
            type="password"
            minLength={6}
            required
            className="input"
            style={{ maxWidth: 280 }}
            placeholder={t("newPassword")}
          />
          <button type="submit" className="btn btn-soft">
            {t("changePassword")}
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
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("categoriesTitle")}</h3>
        <p className="muted">{t("categoriesHint")}</p>
        <ActionForm action={upsertServiceCategoryAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("categoryName")}</label>
              <input name="name" required className="input" placeholder="Dental / Lab / General" />
            </div>
            <div className="field">
              <label>
                {t("description")}{" "}
                <span className="muted">({t("optional")})</span>
              </label>
              <input name="description" className="input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            {t("addCategory")}
          </button>
        </ActionForm>

        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data">
            <thead>
              <tr>
                <th>{t("categoryName")}</th>
                <th>{t("description")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(categories || []).map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="badge">{c.name}</span>
                  </td>
                  <td>{c.description || "—"}</td>
                  <td>
                    <form
                      action={async () => {
                        "use server";
                        await deleteServiceCategoryAction(c.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="btn btn-ghost"
                        style={{ padding: "0.35rem 0.7rem" }}
                      >
                        {t("delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!categories?.length ? (
                <tr>
                  <td colSpan={3} className="muted">
                    {t("emptyCategories")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("servicesTitle")}</h3>
        <p className="muted">{t("servicesHint")}</p>
        <ActionForm action={upsertServiceItemAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("serviceName")}</label>
              <input name="name" required className="input" />
            </div>
            <div className="field">
              <label>{t("assignCategory")}</label>
              <select name="category_id" required className="select" defaultValue="">
                <option value="" disabled>
                  —
                </option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("price")}</label>
              <input name="unit_price" type="number" step="0.01" defaultValue={0} className="input" />
            </div>
            <div className="field">
              <label>
                {t("description")}{" "}
                <span className="muted">({t("optional")})</span>
              </label>
              <input name="description" className="input" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!categories?.length}>
            {t("addService")}
          </button>
        </ActionForm>
        {!categories?.length ? (
          <p className="muted" style={{ marginTop: 8 }}>
            {t("needCategoryFirst")}
          </p>
        ) : null}

        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data">
            <thead>
              <tr>
                <th>{t("serviceName")}</th>
                <th>{t("assignCategory")}</th>
                <th>{t("price")}</th>
                <th>{t("description")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(services || []).map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <span className="badge">
                      {s.service_categories?.name || s.category || "—"}
                    </span>
                  </td>
                  <td>{formatCurrency(Number(s.unit_price || 0))}</td>
                  <td>{s.description || "—"}</td>
                  <td>
                    <form
                      action={async () => {
                        "use server";
                        await deleteServiceItemAction(s.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="btn btn-ghost"
                        style={{ padding: "0.35rem 0.7rem" }}
                      >
                        {t("delete")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!services?.length ? (
                <tr>
                  <td colSpan={5} className="muted">
                    {t("emptyServices")}
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
