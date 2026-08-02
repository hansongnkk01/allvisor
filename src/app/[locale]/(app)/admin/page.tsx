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
  upsertBranchServiceCategoryAction,
  upsertBranchServiceItemAction,
  updateOrgSettingsAction,
  upsertServiceCategoryAction,
  upsertServiceItemAction,
} from "@/app/actions";
import { DataImportPanel } from "@/components/DataImportPanel";
import { AdminActivityLog } from "@/components/AdminActivityLog";
import { FilterableRows } from "@/components/FilterableRows";
import { InvoiceFormatForm } from "@/components/InvoiceFormatForm";
import { BranchClinicSettings } from "@/components/BranchClinicSettings";
import { formatCurrency } from "@/lib/utils";
import { defaultAdminPassword } from "@/lib/admin-lock";
import {
  assignableStaffRoles,
  canAccessAdmin,
  canManageStaff,
  staffRoleLabel,
} from "@/lib/roles";

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
  /** Anyone who can open Admin sees settings panels (clinic + retail). Staff add/kick stays owner/admin. */
  const canManageTeam = canManageStaff(ctx.membership.role);
  const rolesCanAssign = assignableStaffRoles(ctx.membership.role);

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

  // Fill profile names via service role when RLS embed returns null (teammates)
  let membersResolved = members || [];
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && membersResolved.length) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const userIds = membersResolved.map((m) => m.user_id);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    const byId = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
    membersResolved = membersResolved.map((m) => ({
      ...m,
      profiles: byId[m.user_id]
        ? {
            full_name: byId[m.user_id].full_name,
            email: byId[m.user_id].email,
          }
        : m.profiles,
    }));
  }

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
    service_charge_percent: number;
    clinic_open_hour: number;
    clinic_close_hour: number;
    closed_weekdays: number[];
  }> = [
    {
      id: orgId,
      name: ctx.organization.name,
      categories: categories || [],
      services: services || [],
      members: membersResolved,
      service_charge_percent: Number(ctx.organization.service_charge_percent ?? 0),
      clinic_open_hour: Number(ctx.organization.clinic_open_hour ?? 0),
      clinic_close_hour: Number(ctx.organization.clinic_close_hour ?? 23),
      closed_weekdays: ctx.organization.closed_weekdays || [],
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
        .select(
          "id, name, service_charge_percent, clinic_open_hour, clinic_close_hour, closed_weekdays"
        )
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
          service_charge_percent: Number(lo.service_charge_percent ?? 0),
          clinic_open_hour: Number(lo.clinic_open_hour ?? 0),
          clinic_close_hour: Number(lo.clinic_close_hour ?? 23),
          closed_weekdays: (lo.closed_weekdays as number[] | null) || [],
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
            <p className="muted">{t("businessSettingsHint")}</p>
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

          <DataImportPanel
            labels={{
              title: t("importTitle"),
              hint: t("importHint"),
              steps: t("importSteps"),
              kind: t("importKind"),
              downloadTemplate: t("importDownloadTemplate"),
              chooseFile: t("importChooseFile"),
              preview: t("importPreview"),
              importBtn: t("importBtn"),
              importing: t("importing"),
              patients: t("importPatients"),
              products: t("importProducts"),
              serviceCategories: t("importServiceCategories"),
              serviceItems: t("importServiceItems"),
              appointments: t("importAppointments"),
              orderHint: t("importOrderHint"),
              noRows: t("importNoRows"),
              success: t("importSuccess"),
              partial: t("importPartial"),
            }}
          />

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

      {branchOrgs.map((branch, idx) => (
        <BranchGroup
          key={branch.id}
          title={`${idx + 1}. ${branch.name}${branch.id === orgId ? ` (${t("thisClinic")})` : ""}`}
          defaultOpen={idx === 0}
          toneIndex={idx}
        >
          <div className="stack" style={{ gap: "0.85rem" }}>
            <BranchClinicSettings
              branchId={branch.id}
              settings={{
                serviceChargePercent: branch.service_charge_percent,
                openHour: branch.clinic_open_hour,
                closeHour: branch.clinic_close_hour,
                closedWeekdays: branch.closed_weekdays,
              }}
              labels={{
                title: t("clinicHoursTitle"),
                hint: t("clinicHoursHint"),
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
                holidayNote: t("holidayNote"),
                saveHours: t("saveHours"),
              }}
            />
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
              <FilterableRows placeholder={t("searchCategories")}>
                {(branch.categories || []).map((c) => (
                  <tr
                    key={c.id}
                    data-search={`${c.name} ${c.description || ""}`.toLowerCase()}
                  >
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
              </FilterableRows>
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
              <FilterableRows placeholder={t("searchServices")}>
                {(branch.services || []).map((s) => (
                  <tr
                    key={s.id}
                    data-search={`${s.name} ${s.service_categories?.name || s.category || ""}`.toLowerCase()}
                  >
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
              </FilterableRows>
            </ExpandSection>

            <ExpandSection title={t("staffTitle")} defaultOpen={branch.id === orgId}>
              {rolesCanAssign.length ? (
                <>
                  <p className="muted">{t("addMemberHint")}</p>
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
                        <label>{t("staffUsername")}</label>
                        <input
                          name="username"
                          type="email"
                          required
                          className="input"
                          placeholder="member@email.com"
                        />
                      </div>
                      <div className="field">
                        <label>{t("staffName")}</label>
                        <input name="full_name" className="input" />
                      </div>
                      <div className="field">
                        <label>{t("staffRole")}</label>
                        <select name="role" className="select" defaultValue="staff">
                          {rolesCanAssign.map((role) => (
                            <option key={role} value={role}>
                              {staffRoleLabel(role)}
                            </option>
                          ))}
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
                </>
              ) : (
                <p className="muted">{t("addMemberHint")}</p>
              )}

              <div style={{ marginTop: 12 }}>
                <FilterableRows
                  placeholder={t("searchStaff")}
                  headers={
                    <tr>
                      <th>{t("staffName")}</th>
                      <th>{t("staffEmail")}</th>
                      <th>{t("staffRole")}</th>
                      <th>{t("jobTitle")}</th>
                      <th>{t("kickStaff")}</th>
                    </tr>
                  }
                >
                  {(branch.members || []).map((m) => {
                    const name = m.profiles?.full_name || "";
                    const email = m.profiles?.email || "";
                    return (
                      <tr
                        key={m.id}
                        data-search={`${name} ${email} ${m.role} ${m.job_title || ""}`.toLowerCase()}
                      >
                        <td>{name || "—"}</td>
                        <td>{email || "—"}</td>
                        <td>
                          <span className="badge">{staffRoleLabel(m.role)}</span>
                        </td>
                        <td>{m.job_title || "—"}</td>
                        <td>
                          {canManageTeam &&
                          m.role !== "owner" &&
                          m.user_id !== ctx.profile.id ? (
                            <ActionForm
                              action={
                                branch.id === orgId
                                  ? kickStaffAction
                                  : kickBranchStaffAction
                              }
                            >
                              <input type="hidden" name="membership_id" value={m.id} />
                              {branch.id !== orgId ? (
                                <input
                                  type="hidden"
                                  name="target_org_id"
                                  value={branch.id}
                                />
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
                    );
                  })}
                </FilterableRows>
              </div>
            </ExpandSection>
          </div>
        </BranchGroup>
      ))}

      <AdminActivityLog
        title={t("activity")}
        hint={t("activityHint")}
        logs={(activities || []).map((a) => ({
          id: a.id,
          actor_name: a.actor_name,
          summary: a.summary,
          created_at: a.created_at,
        }))}
      />
    </div>
  );
}
