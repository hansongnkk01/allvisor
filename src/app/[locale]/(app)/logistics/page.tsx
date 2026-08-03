import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { requireOrg } from "@/lib/org";
import { hasCapability } from "@/lib/niches";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { StockDocumentForm } from "@/components/StockDocumentForm";
import {
  addSupplierAction,
  createGoodsReceiptAction,
  createStockAdjustmentDocumentAction,
  createStockTransferAction,
} from "@/app/retail-actions";
import { formatDateTime } from "@/lib/utils";

const tabs = ["suppliers", "grn", "adjustments", "transfers"] as const;

export default async function LogisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const { tab: requestedTab } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("RetailPages");
  const ctx = await requireOrg(locale);
  if (!hasCapability(ctx.organization.niche, "logistics")) redirect({ href: "/dashboard", locale });
  const tab = tabs.includes(requestedTab as (typeof tabs)[number])
    ? requestedTab as (typeof tabs)[number]
    : "suppliers";
  const supabase = await createClient();
  const [{ data: products }, { data: suppliers }, { data: grns }, { data: adjustments }, { data: transfers }] =
    await Promise.all([
      supabase.from("products").select("id, name, quantity").eq("organization_id", ctx.organization.id).order("name"),
      supabase.from("suppliers").select("*").eq("organization_id", ctx.organization.id).order("created_at", { ascending: false }),
      supabase.from("goods_receipts").select("id, grn_number, status, received_at, suppliers(name)").eq("organization_id", ctx.organization.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("stock_adjustments").select("*").eq("organization_id", ctx.organization.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("stock_transfers").select("*").eq("organization_id", ctx.organization.id).order("created_at", { ascending: false }).limit(50),
    ]);
  const productOptions = (products || []).map((product) => ({ ...product, quantity: Number(product.quantity) }));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <PageHeader title={t("logisticsTitle")} subtitle={t("logisticsSubtitle")} />
      <div className="row" style={{ flexWrap: "wrap" }}>
        {tabs.map((name) => <Link key={name} href={`/logistics?tab=${name}`} className={`btn ${tab === name ? "btn-primary" : "btn-soft"}`}>{name === "grn" ? "GRN" : name[0].toUpperCase() + name.slice(1)}</Link>)}
      </div>

      {tab === "suppliers" ? (
        <>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Add supplier</h3>
            <ActionForm action={addSupplierAction} className="row" style={{ flexWrap: "wrap" }}>
              <input className="input" name="name" required placeholder="Supplier name" />
              <input className="input" name="phone" placeholder="Phone" />
              <input className="input" name="email" type="email" placeholder="Email" />
              <input className="input" name="address" placeholder="Address" />
              <button className="btn btn-primary" type="submit">Add supplier</button>
            </ActionForm>
          </div>
          <SimpleTable headers={["Supplier", "Phone", "Email", "Address"]} rows={(suppliers || []).map((supplier) => [supplier.name, supplier.phone || "—", supplier.email || "—", supplier.address || "—"])} />
        </>
      ) : null}

      {tab === "grn" ? (
        <>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Receive goods</h3>
            <StockDocumentForm products={productOptions} action={createGoodsReceiptAction} kind="grn">
              <select className="select" name="supplier_id" defaultValue=""><option value="">No supplier</option>{(suppliers || []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
              <input className="input" name="notes" placeholder="GRN notes" />
            </StockDocumentForm>
          </div>
          <SimpleTable headers={["GRN", "Supplier", "Status", "Received"]} rows={(grns || []).map((grn) => {
            const supplierRaw = Array.isArray(grn.suppliers) ? grn.suppliers[0] : grn.suppliers;
            return [grn.grn_number, (supplierRaw as { name?: string } | null)?.name || "—", grn.status, grn.received_at ? formatDateTime(grn.received_at) : "—"];
          })} />
        </>
      ) : null}

      {tab === "adjustments" ? (
        <>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Stock adjustment document</h3>
            <StockDocumentForm products={productOptions} action={createStockAdjustmentDocumentAction} kind="adjustment">
              <input className="input" name="reason" required placeholder="Reason" />
              <input className="input" name="notes" placeholder="Notes" />
            </StockDocumentForm>
          </div>
          <SimpleTable headers={["Document", "Reason", "Staff", "Created"]} rows={(adjustments || []).map((item) => [item.adjustment_number, item.reason || "—", item.created_by_name || "—", formatDateTime(item.created_at)])} />
        </>
      ) : null}

      {tab === "transfers" ? (
        <>
          <div className="surface" style={{ padding: "1.25rem" }}>
            <h3 style={{ marginTop: 0 }}>Transfer stock out</h3>
            <StockDocumentForm products={productOptions} action={createStockTransferAction} kind="transfer">
              <div className="row"><input className="input" name="from_location" defaultValue="main" required placeholder="From location" /><input className="input" name="to_location" required placeholder="To location" /></div>
              <input className="input" name="notes" placeholder="Notes" />
            </StockDocumentForm>
          </div>
          <SimpleTable headers={["Transfer", "From", "To", "Status", "Created"]} rows={(transfers || []).map((item) => [item.transfer_number, item.from_location, item.to_location, item.status, formatDateTime(item.created_at)])} />
        </>
      ) : null}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="surface" style={{ padding: "1.25rem" }}><div className="table-wrap"><table className="data">
      <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={headers.length} className="muted">No records yet.</td></tr> : null}</tbody>
    </table></div></div>
  );
}
