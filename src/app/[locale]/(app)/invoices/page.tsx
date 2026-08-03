import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireOrg } from "@/lib/org";
import { hasCapability } from "@/lib/niches";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { SectionActivityLog } from "@/components/SectionActivityLog";
import { InvoicesWorkspace } from "@/components/InvoicesWorkspace";
import { getInvoicePreviewAction } from "@/app/actions";
import { canAccessSensitive } from "@/lib/roles";
import { canUseLhdn } from "@/lib/subscription";
import { fetchSectionLogs } from "@/lib/section-logs";
import type { InvoiceStatus } from "@/lib/types";

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { locale } = await params;
  const { preview } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Invoices");
  const td = await getTranslations("InvoiceDetail");
  const ctx = await requireOrg(locale);
  const supabase = await createClient();
  const isClinic = hasCapability(ctx.organization.niche, "allergies");

  const [{ data: invoices }, logs] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, title, notes, status, total, amount_paid, created_at, issue_date, lhdn_status, tax_amount, customers(name, risk_level, allergies)"
      )
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: false })
      .limit(250),
    fetchSectionLogs(ctx.organization.id, ["invoice", "pos"], 25),
  ]);

  const canLhdn = canAccessSensitive(ctx.membership.role);
  const planLocked = !canUseLhdn(
    ctx.organization.subscription_plan,
    ctx.organization.subscription_status
  );
  const needTin = !ctx.organization.tin;

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("title")} />

      <InvoicesWorkspace
        invoices={(invoices || []).map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          title: inv.title,
          notes: inv.notes ?? null,
          status: inv.status as InvoiceStatus,
          total: Number(inv.total),
          amount_paid: Number(inv.amount_paid),
          created_at: inv.created_at,
          issue_date: inv.issue_date,
          lhdn_status: inv.lhdn_status,
          tax_amount: Number(inv.tax_amount || 0),
          customers: Array.isArray(inv.customers)
            ? inv.customers[0] || null
            : inv.customers,
        }))}
        canLhdn={canLhdn}
        loadPreview={getInvoicePreviewAction}
        initialPreviewId={preview || null}
        showAllergies={isClinic}
        labels={{
          number: t("number"),
          customer: t("customer"),
          status: t("status"),
          total: t("total"),
          paid: t("paid"),
          createdAt: t("createdAt"),
          actions: t("actions"),
          view: t("view"),
          viewPrint: t("viewPrint"),
          empty: t("empty"),
          revoke: t("revoke"),
          filterDay: t("filterDay"),
          allDays: t("allDays"),
          submitLhdn: td("submitLhdn"),
          resubmitLhdn: td("resubmitLhdn"),
          submitLhdnHint: td("submitLhdnHint"),
          submitLhdnPlanLocked: td("submitLhdnPlanLocked"),
          submitLhdnNeedTin: td("submitLhdnNeedTin"),
          submitLhdnAlready: td("submitLhdnAlready"),
          refreshLhdnStatus: td("refreshLhdnStatus"),
          lhdnStatusLine: td("lhdnStatusLine"),
          cancelLhdn: td("cancelLhdn"),
          cancelLhdnHint: td("cancelLhdnHint"),
          cancelLhdnPrompt: td("cancelLhdnPrompt"),
          recordPayment: td("recordPayment"),
          balanceDue: td("balanceDue"),
          pay: td("pay"),
          editStatus: td("editStatus"),
          editStatusHint: td("editStatusHint"),
          statusNote: td("statusNote"),
          saveStatus: td("saveStatus"),
          payments: td("payments"),
          noPayments: td("noPayments"),
          date: td("date"),
          method: td("method"),
          print: td("print"),
          billTo: td("billTo"),
          description: td("description"),
          qty: td("qty"),
          price: td("price"),
          amount: td("amount"),
          subtotal: td("subtotal"),
          tax: td("tax"),
          medicine: isClinic ? td("medicine") : td("medicineRetail"),
          additional: td("additional"),
          productService: td("productService"),
          serviceTax: td("serviceTax"),
          addCost: td("addCost"),
          deleteCost: td("deleteCost"),
          costKind: td("costKind"),
          costDesc: td("costDesc"),
          costAmount: td("costAmount"),
          costItem: td("costItem"),
          costQty: td("costQty"),
          noInventory: td("noInventory"),
          extrasHint: isClinic ? td("extrasHint") : td("extrasHintRetail"),
          exitWarn: t("exitWarn"),
          exitReasonTitle: t("exitReasonTitle"),
          exitReasonHint: t("exitReasonHint"),
          exitReasonPlaceholder: t("exitReasonPlaceholder"),
          exitConfirm: t("exitConfirm"),
          searchPlaceholder: t("searchPlaceholder"),
          needTin,
          planLocked,
        }}
      />

      <SectionActivityLog title={t("activity")} logs={logs} pageSize={5} />
    </div>
  );
}
