import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { BranchGroup, ExpandSection } from "@/components/BranchGroup";
import {
  addBranchStaffAction,
  addStaffAction,
  changeAdminPasswordAction,
  deleteServiceCategoryAction,
  deleteServiceItemAction,
  getDefaultAdminPasswordHint,
  isAdminUnlocked,
  kickBranchStaffAction,
  kickStaffAction,
  requestBranchLinkAction,
  respondBranchLinkAction,
  unlockAdminAction,
  upgradePlanAction,
  upsertBranchServiceCategoryAction,
  upsertBranchServiceItemAction,
  upsertServiceCategoryAction,
  upsertServiceItemAction,
} from "@/app/actions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PLAN_LIMITS } from "@/lib/subscription";
import { defaultAdminPassword } from "@/lib/admin-lock";
import { canAccessAdmin, canManageStaff } from "@/lib/roles";
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

  if (!canAccessAdmin(ctx.membership.role)) {
    redirect({ href: "/dashboard", locale });
  }

  const unlocked = await isAdminUnlocked();
  const hint = await getDefaultAdminPasswordHint();
  const isAdmin = canManageStaff(ctx.membership.role);

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
  const orgId = ctx.organization.id;

  const [
    { data: categories },
    { data: services },
    { data: members },
    { data: activities },
    { data: pendingRequests },
    { data: outgoingPending },
    { data: links },
  ] = await Promise.all([
    supabase
      .from("service_categories")
      .select("*")
      .eq("organization_id", orgId)
      .order("name"),
    supabase
      .from("service_items")
      .select("*, service_categories(name)")
      .eq("organization_id", orgId)
      .order("name"),
    supabase
      .from("memberships")
      .select("*, profiles(full_name, email)")
      .eq("organization_id", orgId)
      .order("created_at"),
    supabase
      .from("activity_logs")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50),
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
    supabase
      .from("branch_links")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at"),
  ]);

  // Resolve linked org names via service-visible query through request/response orgs
  // Use linked ids; fetch names with a second query if possible via memberships only —
  // for names we store from requests or use admin client through action. Fallback: show id slice.
  const linkedIds = (links || []).map((l) => l.linked_organization_id);
  const branchOrgs: Array<{
    id: string;
    name: string;
    categories: typeof categories;
    services: typeof services;
    members: typeof members;
  }> = [
    {
      id: orgId,
      name: ctx.organization.name,
      categories: categories || [],
      services: services || [],
      members: members || [],
    },
  ];

  if (linkedIds.length) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const admin = createAdminClient(url, key);
      const { data: linkedOrgs } = await admin
        .from("organizations")
        .select("id, name")
        .in("id", linkedIds)
        .order("name");

      for (const lo of linkedOrgs || []) {
        const [{ data: cats }, { data: svcs }, { data: mems }] = await Promise.all([
          admin
            .from("service_categories")
            .select("*")
            .eq("organization_id", lo.id)
            .order("name"),
          admin
            .from("service_items")
            .select("*, service_categories(name)")
            .eq("organization_id", lo.id)
            .order("name"),
          admin
            .from("memberships")
            .select("*, profiles(full_name, email)")
            .eq("organization_id", lo.id)
            .order("created_at"),
        ]);
        branchOrgs.push({
          id: lo.id,
          name: lo.name,
          categories: cats || [],
          services: svcs || [],
          members: mems || [],
        });
      }
    }
  }

  const isSuper = branchOrgs.length > 1;
  const org = ctx.organization;

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
      <PageHeader
        title={isSuper ? t("superTitle") : t("title")}
        subtitle={isSuper ? t("superSubtitle") : t("subtitle")}
      />

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

      {isAdmin ? (
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
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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
            <h3 style={{ marginTop: 0 }}>{t("addBranch")}</h3>
            <p className="muted">{t("addBranchHint")}</p>
            <ActionForm action={requestBranchLinkAction} className="row">
              <input
                name="branch_name"
                className="input"
                required
                placeholder="Superclinic KL"
                style={{ maxWidth: 320 }}
              />
              <button type="submit" className="btn btn-primary">
                {t("requestLink")}
              </button>
            </ActionForm>
            {(outgoingPending || []).length ? (
              <p className="muted" style={{ marginTop: 8 }}>
                {t("outgoingPending")}: {(outgoingPending || []).length}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {branchOrgs.map((branch, idx) => (
        <BranchGroup
          key={branch.id}
          title={`${idx + 1}. ${branch.name}${branch.id === orgId ? ` (${t("thisClinic")})` : ""}`}
          defaultOpen={idx === 0}
          toneIndex={idx}
        >
          <div className="stack" style={{ gap: "0.85rem" }}>
            <ExpandSection title={t("categoriesTitle")} defaultOpen>
              <ActionForm
                action={
                  branch.id === orgId
                    ? upsertServiceCategoryAction
                    : upsertBranchServiceCategoryAction
                }
                className="stack"
              >
                {branch.id !== orgId ? (
                  <input type="hidden" name="target_org_id" value={branch.id} />
                ) : null}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "0.65rem",
                  }}
                >
                  <div className="field">
                    <label>{t("categoryName")}</label>
                    <input name="name" required className="input" />
                  </div>
                  <div className="field">
                    <label>{t("description")}</label>
                    <input name="description" className="input" />
                  </div>
                </div>
                <button type="submit" className="btn btn-soft">
                  {t("addCategory")}
                </button>
              </ActionForm>
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table className="data">
                  <tbody>
                    {(branch.categories || []).map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className="badge">{c.name}</span>
                        </td>
                        <td>{c.description || "—"}</td>
                        {branch.id === orgId ? (
                          <td>
                            <form
                              action={async () => {
                                "use server";
                                await deleteServiceCategoryAction(c.id);
                              }}
                            >
                              <button type="submit" className="btn btn-ghost">
                                {t("delete")}
                              </button>
                            </form>
                          </td>
                        ) : (
                          <td />
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ExpandSection>

            <ExpandSection title={t("servicesTitle")}>
              <ActionForm
                action={
                  branch.id === orgId
                    ? upsertServiceItemAction
                    : upsertBranchServiceItemAction
                }
                className="stack"
              >
                {branch.id !== orgId ? (
                  <input type="hidden" name="target_org_id" value={branch.id} />
                ) : null}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "0.65rem",
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
                      {(branch.categories || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>{t("price")}</label>
                    <input
                      name="unit_price"
                      type="number"
                      step="0.01"
                      defaultValue={0}
                      className="input"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-soft">
                  {t("addService")}
                </button>
              </ActionForm>
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table className="data">
                  <tbody>
                    {(branch.services || []).map((s) => (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td>{s.service_categories?.name || s.category}</td>
                        <td>{formatCurrency(Number(s.unit_price || 0))}</td>
                        {branch.id === orgId ? (
                          <td>
                            <form
                              action={async () => {
                                "use server";
                                await deleteServiceItemAction(s.id);
                              }}
                            >
                              <button type="submit" className="btn btn-ghost">
                                {t("delete")}
                              </button>
                            </form>
                          </td>
                        ) : (
                          <td />
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ExpandSection>

            {isAdmin ? (
              <ExpandSection title={t("staffTitle")}>
                <ActionForm
                  action={branch.id === orgId ? addStaffAction : addBranchStaffAction}
                  className="stack"
                >
                  {branch.id !== orgId ? (
                    <input type="hidden" name="target_org_id" value={branch.id} />
                  ) : null}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: "0.65rem",
                    }}
                  >
                    <div className="field">
                      <label>{t("staffName")}</label>
                      <input name="full_name" className="input" />
                    </div>
                    <div className="field">
                      <label>{t("staffEmail")}</label>
                      <input name="email" type="email" required className="input" />
                    </div>
                    <div className="field">
                      <label>{t("staffPassword")}</label>
                      <input name="password" type="password" className="input" />
                    </div>
                    <div className="field">
                      <label>{t("staffRole")}</label>
                      <select name="role" className="select" defaultValue="staff">
                        <option value="staff">staff</option>
                        <option value="manager">manager</option>
                        <option value="supervisor">supervisor</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>{t("jobTitle")}</label>
                      <input
                        name="job_title"
                        className="input"
                        placeholder="Supervisor / Nurse / …"
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">
                    {t("addStaff")}
                  </button>
                </ActionForm>

                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="data">
                    <thead>
                      <tr>
                        <th>{t("staffName")}</th>
                        <th>{t("staffEmail")}</th>
                        <th>{t("staffRole")}</th>
                        <th>{t("jobTitle")}</th>
                        <th>{t("kickStaff")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(branch.members || []).map((m) => (
                        <tr key={m.id}>
                          <td>{m.profiles?.full_name || "—"}</td>
                          <td>{m.profiles?.email || "—"}</td>
                          <td>
                            <span className="badge">{m.role}</span>
                          </td>
                          <td>{m.job_title || "—"}</td>
                          <td>
                            {m.role !== "owner" && m.user_id !== ctx.profile.id ? (
                              <ActionForm
                                action={
                                  branch.id === orgId
                                    ? kickStaffAction
                                    : kickBranchStaffAction
                                }
                              >
                                <input type="hidden" name="membership_id" value={m.id} />
                                {branch.id !== orgId ? (
                                  <input type="hidden" name="target_org_id" value={branch.id} />
                                ) : null}
                                <button type="submit" className="btn btn-ghost">
                                  {t("kick")}
                                </button>
                              </ActionForm>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ExpandSection>
            ) : null}
          </div>
        </BranchGroup>
      ))}

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("activity")}</h3>
        <p className="muted">{t("activityHint")}</p>
        <div className="stack" style={{ gap: "0.55rem" }}>
          {(activities || []).map((a) => (
            <div
              key={a.id}
              style={{ borderBottom: "1px solid var(--line)", paddingBottom: 6 }}
            >
              <strong>{a.actor_name || "Staff"}</strong>
              <span className="muted"> · {a.summary}</span>
              <div className="muted" style={{ fontSize: "0.8rem" }}>
                {formatDateTime(a.created_at)}
              </div>
            </div>
          ))}
          {!activities?.length ? <p className="muted">—</p> : null}
        </div>
      </div>
    </div>
  );
}
