import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { hasCapability } from "@/lib/niches";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { PatientsList } from "@/components/PatientsList";
import { SectionActivityLog } from "@/components/SectionActivityLog";
import { upsertCustomerAction } from "@/app/actions";
import { createStudentAccountAction } from "@/app/tuition-actions";
import { fetchSectionLogs } from "@/lib/section-logs";
import { formatDateTime } from "@/lib/utils";
import type { Customer } from "@/lib/types";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Customers");
  const tc = await getTranslations("Common");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();
  const isTuition = hasCapability(ctx.organization.niche, "class_schedule");
  const isClinic = hasCapability(ctx.organization.niche, "allergies");

  const [{ data: customers }, { data: deletions }, logs, subjectsRes, portalsRes, enrollRes] =
    await Promise.all([
      supabase
        .from("customers")
        .select(
          "id, name, email, phone, ic_number, address, notes, risk_level, allergies, created_by_name, created_at"
        )
        .eq("organization_id", ctx.organization.id)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("customer_deletions")
        .select("id, customer_name, deleted_by_name, created_at")
        .eq("organization_id", ctx.organization.id)
        .order("created_at", { ascending: false })
        .limit(20),
      fetchSectionLogs(ctx.organization.id, ["customer"], 25),
      isTuition
        ? supabase
            .from("tuition_subjects")
            .select("id, name, price, teacher_name")
            .eq("organization_id", ctx.organization.id)
            .order("name")
        : Promise.resolve({
            data: [] as Array<{ id: string; name: string; price: number; teacher_name: string | null }>,
          }),
      isTuition
        ? supabase
            .from("tuition_students")
            .select("customer_id, email, active")
            .eq("organization_id", ctx.organization.id)
        : Promise.resolve({ data: [] as Array<{ customer_id: string; email: string; active: boolean }> }),
      isTuition
        ? supabase
            .from("tuition_subject_enrollments")
            .select("customer_id, subject_id, tuition_subjects(name)")
            .eq("organization_id", ctx.organization.id)
        : Promise.resolve({
            data: [] as Array<{
              customer_id: string;
              subject_id: string;
              tuition_subjects: { name: string } | { name: string }[] | null;
            }>,
          }),
    ]);

  const subjects = subjectsRes.data || [];
  const portalByCustomer = new Map(
    (portalsRes.data || []).map((p) => [p.customer_id, p] as const)
  );
  const subjectsByCustomer = new Map<string, string[]>();
  for (const e of enrollRes.data || []) {
    const sub = Array.isArray(e.tuition_subjects) ? e.tuition_subjects[0] : e.tuition_subjects;
    const name = sub?.name;
    if (!name) continue;
    const list = subjectsByCustomer.get(e.customer_id) || [];
    list.push(name);
    subjectsByCustomer.set(e.customer_id, list);
  }

  const title = isTuition
    ? t("titleTuition")
    : isClinic
      ? t("titleClinic")
      : t("title");
  const deletedTitle = isClinic || isTuition ? t("deletedTitleClinic") : t("deletedTitle");
  const deletedHint = isClinic || isTuition ? t("deletedHintClinic") : t("deletedHint");
  const rowLabels = {
    name: t("name"),
    email: t("email"),
    phone: t("phone"),
    ic: t("ic"),
    address: t("address"),
    notes: t("notes"),
    save: t("save"),
    delete: t("delete"),
    edit: t("edit"),
    cancel: t("cancel"),
    addedBy: t("addedBy"),
    risk: t("risk"),
    allergies: t("allergies"),
    timeline: {
      timeline: t("timeline"),
      close: t("timelineClose"),
      loading: t("timelineLoading"),
      empty: isClinic ? t("timelineEmpty") : t("timelineEmptyRetail"),
      visits: t("timelineVisits"),
      invoices: t("timelineInvoices"),
      notes: t("notes"),
      allergies: t("allergies"),
      contact: t("timelineContact"),
      status: t("timelineStatus"),
      total: t("timelineTotal"),
      paid: t("timelinePaid"),
    },
  };

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader
        title={title}
        subtitle={isTuition ? t("tuitionSubtitle") : undefined}
      />

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{isTuition ? t("addStudent") : t("add")}</h3>
        <ActionForm action={upsertCustomerAction} className="stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div className="field">
              <label>{t("name")}</label>
              <input name="name" required className="input" />
            </div>
            {isClinic ? (
              <div className="field">
                <label>{t("risk")}</label>
                <select name="risk_level" className="select" defaultValue="">
                  <option value="">—</option>
                  <option value="low">{t("riskLow")}</option>
                  <option value="medium">{t("riskMedium")}</option>
                  <option value="high">{t("riskHigh")}</option>
                </select>
              </div>
            ) : null}
            <div className="field">
              <label>{t("ic")}</label>
              <input name="ic_number" className="input" placeholder="900101-14-5678" />
            </div>
            {isTuition ? (
              <div className="field">
                <label>{t("portalPassword")}</label>
                <input
                  name="portal_password"
                  type="password"
                  className="input"
                  minLength={6}
                  required
                  placeholder={t("portalPasswordPlaceholder")}
                />
              </div>
            ) : (
              <div className="field">
                <label>{t("email")}</label>
                <input name="email" type="email" className="input" />
              </div>
            )}
            <div className="field">
              <label>{t("phone")}</label>
              <input name="phone" className="input" />
            </div>
          </div>
          <div className="field">
            <label>{t("address")}</label>
            <input
              name="address"
              required
              className="input"
              placeholder="Street, city, postcode, state (e.g. 12 Jalan Ampang, KL, 50450, Wilayah Persekutuan)"
            />
          </div>
          {isClinic ? (
            <div className="field">
              <label>{t("allergies")}</label>
              <input
                name="allergies"
                className="input"
                placeholder={t("allergiesPlaceholder")}
              />
            </div>
          ) : null}
          <div className="field">
            <label>{t("notes")}</label>
            <textarea name="notes" className="textarea" />
          </div>

          {isTuition ? (
            <>
              <div className="field">
                <label>{t("subjects")}</label>
                <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>
                  {t("subjectsHint")}
                </p>
                {subjects.length ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "0.4rem",
                    }}
                  >
                    {subjects.map((c) => (
                      <label key={c.id} className="row" style={{ gap: "0.4rem", alignItems: "center" }}>
                        <input type="checkbox" name="subject_ids" value={c.id} />
                        <span>
                          {c.name}
                          {c.price != null ? ` (${Number(c.price).toFixed(0)})` : ""}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    {t("noClassesYet")}
                  </p>
                )}
              </div>

              <div
                className="surface"
                style={{
                  padding: "1rem",
                  background: "var(--accent-soft)",
                  border: "none",
                }}
              >
                <label className="row" style={{ gap: "0.5rem", alignItems: "center", fontWeight: 600 }}>
                  <input type="checkbox" name="create_portal" defaultChecked />
                  {t("createPortalAccount")}
                </label>
                <p className="muted" style={{ margin: "0.4rem 0 0", fontSize: "0.9rem" }}>
                  {t("createPortalHintTuition")}
                </p>
              </div>
            </>
          ) : null}

          <button type="submit" className="btn btn-primary">
            {t("save")}
          </button>
        </ActionForm>
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <PatientsList
          customers={(customers || []) as Customer[]}
          labels={rowLabels}
          empty={isTuition ? t("emptyTuition") : t("empty")}
          searchPlaceholder={tc("search")}
          showAllergies={isClinic}
          showRisk={isClinic}
        />
      </div>

      {isTuition ? (
        <div className="surface" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{t("portalAndSubjects")}</h3>
          <p className="muted">{t("portalAndSubjectsHint")}</p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("subjects")}</th>
                  <th>{t("portalStatus")}</th>
                  <th>{t("portalLogin")}</th>
                </tr>
              </thead>
              <tbody>
                {(customers || []).map((c) => {
                  const portal = portalByCustomer.get(c.id);
                  const subjects = subjectsByCustomer.get(c.id) || [];
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{subjects.length ? subjects.join(", ") : "—"}</td>
                      <td>{portal?.active ? t("portalActive") : t("portalNone")}</td>
                      <td>
                        {portal ? (
                          portal.email
                        ) : (
                          <ActionForm action={createStudentAccountAction} className="row" style={{ flexWrap: "wrap", gap: "0.4rem" }}>
                            <input type="hidden" name="customer_id" value={c.id} />
                            <input type="hidden" name="full_name" value={c.name} />
                            <input
                              name="password"
                              type="password"
                              className="input"
                              required
                              minLength={6}
                              placeholder={t("portalPassword")}
                              style={{ minWidth: 140 }}
                            />
                            <button type="submit" className="btn btn-soft">
                              {t("createPortalShort")}
                            </button>
                          </ActionForm>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!customers?.length ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      {t("emptyTuition")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="fluid-grid">
        <div className="surface history-zone" style={{ padding: "1.25rem" }}>
          <h3 style={{ marginTop: 0 }}>{deletedTitle}</h3>
          <p className="muted">{deletedHint}</p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("deletedBy")}</th>
                  <th>{t("deletedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {(deletions || []).map((d) => (
                  <tr key={d.id}>
                    <td>{d.customer_name}</td>
                    <td>{d.deleted_by_name || "—"}</td>
                    <td>{formatDateTime(d.created_at)}</td>
                  </tr>
                ))}
                {!deletions?.length ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      —
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <SectionActivityLog title={t("activity")} logs={logs} pageSize={5} />
      </div>
    </div>
  );
}
