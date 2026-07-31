import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { MultiLineInvoiceForm } from "@/components/MultiLineInvoiceForm";
import { InvoiceLhdnRowActions } from "@/components/InvoiceLhdnRowActions";
import { createInvoiceAction, recordPaymentAction } from "@/app/actions";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { canAccessSensitive, canEditInvoiceIdentity } from "@/lib/roles";
import { canUseLhdn } from "@/lib/subscription";
import { displayLhdnStatus } from "@/lib/lhdn";
import { SectionActivityLog } from "@/components/SectionActivityLog";
import { PatientName } from "@/components/PatientName";
import { fetchSectionLogs } from "@/lib/section-logs";
import type { ServiceItem } from "@/lib/types";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Invoices");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();

  const [{ data: invoices }, { data: customers }, { data: services }, logs] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("*, customers(name, risk_level)")
        .eq("organization_id", ctx.organization.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("customers")
        .select("id, name")
        .eq("organization_id", ctx.organization.id)
        .order("name"),
      supabase
        .from("service_items")
        .select("*, service_categories(name)")
        .eq("organization_id", ctx.organization.id)
        .eq("is_active", true)
        .order("name"),
      fetchSectionLogs(ctx.organization.id, ["invoice", "pos"]),
    ]);

  const showLhdnActions = canAccessSensitive(ctx.membership.role);
  const lhdnPlanOk = canUseLhdn(
    ctx.organization.subscription_plan,
    ctx.organization.subscription_status
  );
  const hasTin = Boolean(ctx.organization.tin);

  const invoiceIds = (invoices || []).map((inv) => inv.id);
  const lhdnByInvoice = new Map<
    string,
    { uuid: string | null; status: string | null; myinvoisStatus?: string | null }
  >();
  if (showLhdnActions && invoiceIds.length) {
    const { data: submissions } = await supabase
      .from("lhdn_submissions")
      .select("invoice_id, uuid, status, response, created_at")
      .eq("organization_id", ctx.organization.id)
      .in("invoice_id", invoiceIds)
      .order("created_at", { ascending: false });
    for (const row of submissions || []) {
      if (lhdnByInvoice.has(row.invoice_id)) continue;
      lhdnByInvoice.set(row.invoice_id, {
        uuid: row.uuid,
        status: row.status,
        myinvoisStatus: (
          (row.response || {}) as { myinvoisStatus?: string }
        ).myinvoisStatus,
      });
    }
  }

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} />

      {canEditInvoiceIdentity(ctx.membership.role) ? (
      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("howItWorksTitle")}</h3>
        <div className="stack" style={{ gap: "0.55rem" }}>
          <p style={{ margin: 0 }}>{t("howNumber")}</p>
          <p style={{ margin: 0 }}>{t("howName")}</p>
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            {t("howStatus")}
          </p>
        </div>
      </div>
      ) : null}

      <div className="surface" style={{ padding: "1.25rem" }}>
        <h3 style={{ marginTop: 0 }}>{t("add")}</h3>
        <MultiLineInvoiceForm
          customers={customers || []}
          services={(services || []) as ServiceItem[]}
          action={createInvoiceAction}
          showCustomIdentity={canEditInvoiceIdentity(ctx.membership.role)}
          labels={{
            customer: t("customer"),
            invoiceNumber: t("invoiceNumber"),
            invoiceTitle: t("invoiceTitle"),
            lines: t("lines"),
            description: t("description"),
            qty: t("qty"),
            price: t("price"),
            selectPrice: t("selectPrice"),
            tax: t("tax"),
            save: t("save"),
            addLine: t("addLine"),
            removeLine: t("removeLine"),
            subtotal: t("subtotal"),
            total: t("total"),
            customNumberHint: t("customNumberHint"),
            medicine: t("medicine"),
            medicineDesc: t("medicineDesc"),
            medicineAmount: t("medicineAmount"),
            additional: t("additional"),
            additionalDesc: t("additionalDesc"),
            additionalAmount: t("additionalAmount"),
            optional: t("optional"),
          }}
        />
      </div>

      <div className="surface" style={{ padding: "1.25rem" }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("number")}</th>
                <th>{t("customer")}</th>
                <th>{t("status")}</th>
                <th>{t("total")}</th>
                <th>{t("paid")}</th>
                <th>{t("createdAt")}</th>
                <th>{t("actions")}</th>
                <th>{t("recordPayment")}</th>
              </tr>
            </thead>
            <tbody>
              {(invoices || []).map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div>{inv.title || inv.invoice_number}</div>
                    <div className="muted" style={{ fontSize: "0.8rem" }}>
                      {inv.invoice_number}
                    </div>
                  </td>
                  <td>
                    {inv.customers?.name ? (
                      <PatientName
                        name={inv.customers.name}
                        risk={
                          (inv.customers as { risk_level?: "high" | "medium" | "low" | null })
                            .risk_level
                        }
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span className="badge">{inv.status}</span>
                  </td>
                  <td>{formatCurrency(Number(inv.total))}</td>
                  <td>{formatCurrency(Number(inv.amount_paid))}</td>
                  <td>{formatDateTime(inv.created_at)}</td>
                  <td>
                    <div className="stack" style={{ gap: "0.45rem", alignItems: "flex-start" }}>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="btn btn-soft"
                        style={{ padding: "0.35rem 0.7rem" }}
                      >
                        {inv.status === "paid" ? t("viewPrint") : t("view")}
                      </Link>
                      {showLhdnActions ? (
                        (() => {
                          const sub = lhdnByInvoice.get(inv.id);
                          const lhdnStatus =
                            inv.lhdn_status || sub?.status || "not_submitted";
                          const isCancelled =
                            lhdnStatus === "cancelled" || sub?.status === "cancelled";
                          const isValid = lhdnStatus === "accepted";
                          const hasUuid = Boolean(sub?.uuid);
                          const label =
                            lhdnStatus && lhdnStatus !== "not_submitted"
                              ? displayLhdnStatus(lhdnStatus, sub?.myinvoisStatus)
                              : null;
                          return (
                            <InvoiceLhdnRowActions
                              invoiceId={inv.id}
                              canSubmit={
                                lhdnPlanOk &&
                                hasTin &&
                                inv.status !== "void" &&
                                !isValid &&
                                !isCancelled
                              }
                              canCancel={
                                lhdnPlanOk && hasTin && hasUuid && !isCancelled
                              }
                              lhdnLabel={label}
                              labels={{
                                submit: t("submitLhdn"),
                                cancel: t("cancelLhdn"),
                                cancelPrompt: t("cancelLhdnPrompt"),
                                submitting: t("submittingLhdn"),
                                cancelling: t("cancellingLhdn"),
                              }}
                            />
                          );
                        })()
                      ) : null}
                    </div>
                  </td>
                  <td>
                    {inv.status !== "paid" && inv.status !== "void" ? (
                      <ActionForm action={recordPaymentAction} className="row">
                        <input type="hidden" name="invoice_id" value={inv.id} />
                        <input
                          name="amount"
                          type="number"
                          step="0.01"
                          className="input"
                          style={{ width: 100 }}
                          key={`pay-${inv.id}-${Number(inv.total)}-${Number(inv.amount_paid)}`}
                          defaultValue={Math.max(
                            0,
                            Number(inv.total) - Number(inv.amount_paid)
                          )}
                        />
                        <select name="method" className="select" style={{ width: 110 }}>
                          <option value="cash">cash</option>
                          <option value="card">card</option>
                          <option value="transfer">transfer</option>
                          <option value="ewallet">ewallet</option>
                        </select>
                        <button
                          type="submit"
                          className="btn btn-soft"
                          style={{ padding: "0.45rem 0.8rem" }}
                        >
                          Pay
                        </button>
                      </ActionForm>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {!invoices?.length ? (
                <tr>
                  <td colSpan={8} className="muted">
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
  );
}
