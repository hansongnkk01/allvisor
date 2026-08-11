"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { logActivity } from "@/lib/activity";
import { revalidateApp } from "@/lib/revalidate";
import { formatDayKeyMY } from "@/lib/datetime-my";

async function requireRetailMember() {
  const ctx = await getOrgContext();
  if (!ctx) throw new Error("No organization");
  const { hasCapability } = await import("@/lib/niches");
  // Commerce-like niches that use retail ops tables
  if (
    !hasCapability(ctx.organization.niche, "pos") &&
    !hasCapability(ctx.organization.niche, "cash_drawer") &&
    !hasCapability(ctx.organization.niche, "logistics") &&
    !hasCapability(ctx.organization.niche, "product_categories") &&
    !hasCapability(ctx.organization.niche, "receipts") &&
    !hasCapability(ctx.organization.niche, "printers")
  ) {
    throw new Error("Retail access required");
  }
  return { ...ctx, supabase: await createClient() };
}

function actorName(profile: { full_name: string | null; email: string | null }) {
  return profile.full_name || profile.email || "Staff";
}

function positiveNumber(value: FormDataEntryValue | null) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export async function createProductCategoryAction(formData: FormData) {
  const { supabase, organization } = await requireRetailMember();
  const name = String(formData.get("name") || "").trim();
  const parentId = String(formData.get("parent_id") || "") || null;
  if (!name) return { error: "Category name required" };
  const { data, error } = await supabase
    .from("product_categories")
    .insert({ organization_id: organization.id, name, parent_id: parentId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await logActivity({
    action: "retail.category.create",
    summary: `Created product category: ${name}`,
    entityType: "product_category",
    entityId: data.id,
  });
  revalidateApp("/categories", "/inventory", "/pos");
  return { success: true };
}

export async function bulkAssignProductCategoryAction(formData: FormData) {
  const { supabase, organization } = await requireRetailMember();
  const productIds = [...new Set(formData.getAll("product_ids").map(String).filter(Boolean))];
  const categoryId = String(formData.get("category_id") || "") || null;
  if (!productIds.length) return { error: "Select at least one product" };
  const { error } = await supabase
    .from("products")
    .update({ category_id: categoryId })
    .eq("organization_id", organization.id)
    .in("id", productIds);
  if (error) return { error: error.message };
  await logActivity({
    action: "retail.category.assign",
    summary: `Assigned ${productIds.length} product(s) to a category`,
    entityType: "product_category",
    entityId: categoryId,
  });
  revalidateApp("/categories", "/inventory", "/pos");
  return { success: true };
}

type TicketLineInput = {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
};

export async function savePosTicketAction(formData: FormData) {
  const { supabase, organization, profile } = await requireRetailMember();
  let lines: TicketLineInput[];
  try {
    lines = JSON.parse(String(formData.get("cart_json") || "[]")) as TicketLineInput[];
  } catch {
    return { error: "Invalid ticket data" };
  }
  lines = lines.filter(
    (line) =>
      line.product_id &&
      line.name &&
      Number(line.quantity) > 0 &&
      Number(line.unit_price) >= 0
  );
  if (!lines.length) return { error: "Cart is empty" };
  const ticketId = String(formData.get("ticket_id") || "");
  const ticketNumber =
    String(formData.get("ticket_number") || "").trim() ||
    `T-${Date.now().toString().slice(-8)}`;
  const payload = {
    organization_id: organization.id,
    ticket_number: ticketNumber,
    status: "held",
    customer_id: String(formData.get("customer_id") || "") || null,
    payment_method: String(formData.get("payment_method") || "cash"),
    created_by: profile.id,
    created_by_name: actorName(profile),
    updated_at: new Date().toISOString(),
  };
  const result = ticketId
    ? await supabase
        .from("pos_tickets")
        .update(payload)
        .eq("id", ticketId)
        .eq("organization_id", organization.id)
        .eq("status", "held")
        .select("id, ticket_number")
        .single()
    : await supabase.from("pos_tickets").insert(payload).select("id, ticket_number").single();
  if (result.error || !result.data) {
    return {
      error: ticketId
        ? "Ticket is no longer editable (already completed or voided)"
        : result.error?.message || "Could not save ticket",
    };
  }
  if (ticketId) await supabase.from("pos_ticket_lines").delete().eq("ticket_id", result.data.id);
  const { error: linesError } = await supabase.from("pos_ticket_lines").insert(
    lines.map((line) => ({
      ticket_id: result.data.id,
      product_id: line.product_id,
      name: line.name,
      unit_price: Number(line.unit_price),
      quantity: Number(line.quantity),
      line_total: Number(line.unit_price) * Number(line.quantity),
    }))
  );
  if (linesError) return { error: linesError.message };
  revalidateApp("/pos");
  return { success: true, ticketId: result.data.id, ticketNumber: result.data.ticket_number };
}

export async function voidPosTicketAction(formData: FormData) {
  const { supabase, organization, profile } = await requireRetailMember();
  const id = String(formData.get("ticket_id") || "");
  const voidReason = String(formData.get("void_reason") || "").trim();
  if (!id) return { error: "Ticket required" };
  if (!voidReason) return { error: "Void reason is required" };
  // Only held tickets can be voided — a completed sale must go through the
  // refund flow so money and stock are reversed properly.
  const { data: voided, error } = await supabase
    .from("pos_tickets")
    .update({
      status: "void",
      void_reason: voidReason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", organization.id)
    .eq("status", "held")
    .select("id");
  if (error) return { error: error.message };
  if (!voided || !voided.length) {
    return { error: "Only held tickets can be voided — use refund for completed sales." };
  }
  await logActivity({
    action: "pos.ticket.void",
    summary: `Voided held ticket: ${voidReason}`,
    entityType: "pos_ticket",
    entityId: id,
    meta: { reason: voidReason, by: profile.id },
  });
  // Fire-and-forget: the AI supervisor re-checks this staff member's rates.
  void (async () => {
    try {
      const { runAfterRefundOrVoid } = await import("@/lib/alert-rules");
      await runAfterRefundOrVoid({
        supabase,
        orgId: organization.id,
        staffId: profile.id,
        staffName: actorName(profile),
      });
    } catch {}
  })();
  revalidateApp("/pos");
  return { success: true };
}

export async function refundInvoiceAction(formData: FormData) {
  const { supabase, organization, profile, membership } = await requireRetailMember();
  const { canAccessSensitive } = await import("@/lib/roles");
  if (!canAccessSensitive(membership.role)) {
    return { error: "Manager / supervisor approval required for refunds" };
  }
  const invoiceId = String(formData.get("invoice_id") || "");
  const note = String(formData.get("note") || "POS refund").trim();
  if (!invoiceId) return { error: "Invoice required" };
  const [{ data: invoice }, { data: lines }, { data: existing }, { data: originalPayments }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, customer_id, total, subtotal, tax_amount, status, amount_paid")
      .eq("id", invoiceId)
      .eq("organization_id", organization.id)
      .single(),
    supabase
      .from("invoice_lines")
      .select("product_id, description, quantity, unit_price, line_total")
      .eq("invoice_id", invoiceId),
    supabase
      .from("invoices")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("refund_of_invoice_id", invoiceId)
      .limit(1),
    supabase.from("payments").select("method").eq("invoice_id", invoiceId),
  ]);
  if (!invoice) return { error: "Receipt not found" };
  if (invoice.status === "void") return { error: "Cannot refund a void invoice" };
  if (existing?.length) return { error: "This receipt has already been refunded" };
  if (Number(invoice.amount_paid || 0) <= 0 && Number(invoice.total || 0) > 0) {
    return { error: "Invoice has no recorded payment to refund" };
  }
  const refundNumber = `RF-${invoice.invoice_number}-${Date.now().toString().slice(-4)}`;
  const { data: refund, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: organization.id,
      customer_id: invoice.customer_id,
      invoice_number: refundNumber,
      title: `Refund ${invoice.invoice_number}`,
      status: "paid",
      subtotal: -Math.abs(Number(invoice.subtotal)),
      tax_amount: -Math.abs(Number(invoice.tax_amount)),
      total: -Math.abs(Number(invoice.total)),
      amount_paid: -Math.abs(Number(invoice.total)),
      notes: note,
      refund_of_invoice_id: invoice.id,
      created_by: profile.id,
      created_by_name: actorName(profile),
    })
    .select("id")
    .single();
  if (error || !refund) {
    if (error?.code === "23505" || /duplicate|unique/i.test(error?.message || "")) {
      return { error: "This receipt has already been refunded" };
    }
    return { error: error?.message || "Refund failed" };
  }
  if (lines?.length) {
    const { error: lineError } = await supabase.from("invoice_lines").insert(
      lines.map((line) => ({
        organization_id: organization.id,
        invoice_id: refund.id,
        product_id: line.product_id,
        description: line.description,
        quantity: -Math.abs(Number(line.quantity)),
        unit_price: Number(line.unit_price),
        line_total: -Math.abs(Number(line.line_total)),
      }))
    );
    if (lineError) return { error: lineError.message };
  }
  await supabase.from("payments").insert({
    organization_id: organization.id,
    invoice_id: refund.id,
    amount: -Math.abs(Number(invoice.total)),
    method: "other",
    note,
  });
  if (originalPayments?.some((payment) => payment.method === "cash")) {
    const { data: openSession } = await supabase
      .from("cash_sessions")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (openSession) {
      await supabase.from("cash_movements").insert({
        organization_id: organization.id,
        session_id: openSession.id,
        type: "refund",
        amount: Math.abs(Number(invoice.total)),
        note,
        created_by: profile.id,
        created_by_name: actorName(profile),
      });
    }
  }
  for (const line of lines || []) {
    if (!line.product_id) continue;
    const { data: product } = await supabase
      .from("products")
      .select("id, quantity, track_stock")
      .eq("id", line.product_id)
      .eq("organization_id", organization.id)
      .single();
    if (!product?.track_stock) continue;
    const quantity = Math.abs(Number(line.quantity));
    await supabase
      .from("products")
      .update({ quantity: Number(product.quantity) + quantity })
      .eq("id", product.id);
    await supabase.from("stock_movements").insert({
      organization_id: organization.id,
      product_id: product.id,
      type: "in",
      quantity,
      note: `Refund ${invoice.invoice_number}`,
      created_by: profile.id,
    });
  }
  await supabase.from("ledger_entries").insert({
    organization_id: organization.id,
    entry_type: "expense",
    source: "pos_refund",
    source_id: refund.id,
    amount: Math.abs(Number(invoice.total)),
    entry_date: formatDayKeyMY(),
    description: note,
  });
  await logActivity({
    action: "pos.refund",
    summary: `Refunded receipt ${invoice.invoice_number}`,
    entityType: "invoice",
    entityId: refund.id,
  });
  // Fire-and-forget: the AI supervisor re-checks this staff member's rates.
  void (async () => {
    try {
      const { runAfterRefundOrVoid } = await import("@/lib/alert-rules");
      await runAfterRefundOrVoid({
        supabase,
        orgId: organization.id,
        staffId: profile.id,
        staffName: actorName(profile),
      });
    } catch {}
  })();
  revalidateApp("/receipts", "/inventory", "/invoices", "/dashboard", "/accounting");
  return { success: true };
}

export async function openCashSessionAction(formData: FormData) {
  const { supabase, organization, profile } = await requireRetailMember();
  const openingFloat = positiveNumber(formData.get("opening_float"));
  const { data: open } = await supabase
    .from("cash_sessions")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("status", "open")
    .limit(1);
  if (open?.length) return { error: "A cash session is already open" };
  const { data, error } = await supabase
    .from("cash_sessions")
    .insert({
      organization_id: organization.id,
      opened_by: profile.id,
      opened_by_name: actorName(profile),
      opening_float: openingFloat,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message || "Could not open cash session" };
  await supabase.from("cash_movements").insert({
    organization_id: organization.id,
    session_id: data.id,
    type: "float",
    amount: openingFloat,
    note: "Opening float",
    created_by: profile.id,
    created_by_name: actorName(profile),
  });
  revalidateApp("/cash");
  return { success: true };
}

export async function addCashMovementAction(formData: FormData) {
  const { supabase, organization, profile } = await requireRetailMember();
  const sessionId = String(formData.get("session_id") || "");
  const type = String(formData.get("type") || "in") === "out" ? "out" : "in";
  const amount = positiveNumber(formData.get("amount"));
  if (!sessionId || !amount) return { error: "Session and positive amount required" };
  // Movements only make sense against an open session of this org.
  const { data: session } = await supabase
    .from("cash_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("organization_id", organization.id)
    .eq("status", "open")
    .maybeSingle();
  if (!session) return { error: "Cash session is not open" };
  const { error } = await supabase.from("cash_movements").insert({
    organization_id: organization.id,
    session_id: sessionId,
    type,
    amount,
    note: String(formData.get("note") || "").trim() || null,
    created_by: profile.id,
    created_by_name: actorName(profile),
  });
  if (error) return { error: error.message };
  revalidateApp("/cash");
  return { success: true };
}

export async function closeCashSessionAction(formData: FormData) {
  const { supabase, organization, profile } = await requireRetailMember();
  const sessionId = String(formData.get("session_id") || "");
  const closingCount = Number(formData.get("closing_count") || 0);
  const expected = Number(formData.get("expected_cash") || 0);
  if (!sessionId || closingCount < 0) return { error: "Valid counted cash required" };
  const { data: closed, error } = await supabase
    .from("cash_sessions")
    .update({
      closing_count: closingCount,
      expected_cash: expected,
      variance: closingCount - expected,
      status: "closed",
      closed_by: profile.id,
      closed_by_name: actorName(profile),
      closed_at: new Date().toISOString(),
      notes: String(formData.get("notes") || "").trim() || null,
    })
    .eq("id", sessionId)
    .eq("organization_id", organization.id)
    .eq("status", "open")
    .select("id");
  if (error) return { error: error.message };
  if (!closed || !closed.length) return { error: "Cash session is already closed" };
  // Fire-and-forget: the AI supervisor flags out-of-limit variances.
  void (async () => {
    try {
      const { runAfterCashClose } = await import("@/lib/alert-rules");
      await runAfterCashClose({
        supabase,
        orgId: organization.id,
        staffId: profile.id,
        staffName: actorName(profile),
        sessionId,
        variance: closingCount - expected,
      });
    } catch {}
  })();
  revalidateApp("/cash");
  return { success: true };
}

export async function addSupplierAction(formData: FormData) {
  const { supabase, organization } = await requireRetailMember();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Supplier name required" };
  const { error } = await supabase.from("suppliers").insert({
    organization_id: organization.id,
    name,
    phone: String(formData.get("phone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    address: String(formData.get("address") || "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidateApp("/logistics");
  return { success: true };
}

type StockDocumentLine = { product_id: string; quantity: number; unit_cost?: number };

function parseLines(formData: FormData): StockDocumentLine[] | null {
  try {
    const parsed = JSON.parse(String(formData.get("lines_json") || "[]")) as StockDocumentLine[];
    return parsed
      .map((line) => ({
        product_id: String(line.product_id || ""),
        quantity: Number(line.quantity || 0),
        unit_cost: Number(line.unit_cost || 0),
      }))
      .filter((line) => line.product_id && line.quantity !== 0);
  } catch {
    return null;
  }
}

export async function createGoodsReceiptAction(formData: FormData) {
  const { supabase, organization, profile, membership } = await requireRetailMember();
  const { canAccessSensitive } = await import("@/lib/roles");
  if (!canAccessSensitive(membership.role)) {
    return { error: "Manager / supervisor approval required for GRN" };
  }
  const lines = parseLines(formData);
  if (!lines?.length) return { error: "Add at least one GRN line" };
  const ids = lines.map((line) => line.product_id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name, quantity")
    .eq("organization_id", organization.id)
    .in("id", ids);
  if (products?.length !== new Set(ids).size) return { error: "Product not found" };
  const number = `GRN-${Date.now().toString().slice(-8)}`;
  const { data: grn, error } = await supabase
    .from("goods_receipts")
    .insert({
      organization_id: organization.id,
      supplier_id: String(formData.get("supplier_id") || "") || null,
      grn_number: number,
      status: "received",
      notes: String(formData.get("notes") || "").trim() || null,
      received_by: profile.id,
      received_by_name: actorName(profile),
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !grn) return { error: error?.message || "Could not create GRN" };
  const byId = new Map((products || []).map((product) => [product.id, product]));
  await supabase.from("goods_receipt_lines").insert(
    lines.map((line) => ({
      grn_id: grn.id,
      product_id: line.product_id,
      name: byId.get(line.product_id)?.name || "Product",
      quantity: line.quantity,
      unit_cost: line.unit_cost || 0,
    }))
  );
  for (const line of lines) {
    const product = byId.get(line.product_id)!;
    await supabase
      .from("products")
      .update({ quantity: Number(product.quantity) + line.quantity })
      .eq("id", product.id);
    await supabase.from("stock_movements").insert({
      organization_id: organization.id,
      product_id: product.id,
      type: "in",
      quantity: line.quantity,
      note: number,
      created_by: profile.id,
    });
  }
  revalidateApp("/logistics", "/inventory", "/pos");
  return { success: true };
}

export async function createStockAdjustmentDocumentAction(formData: FormData) {
  const { supabase, organization, profile, membership } = await requireRetailMember();
  const { canAccessSensitive } = await import("@/lib/roles");
  if (!canAccessSensitive(membership.role)) {
    return { error: "Manager / supervisor approval required for stock adjustments" };
  }
  const lines = parseLines(formData);
  if (!lines?.length) return { error: "Add at least one adjustment line" };
  const { data: products } = await supabase
    .from("products")
    .select("id, name, quantity")
    .eq("organization_id", organization.id)
    .in("id", lines.map((line) => line.product_id));
  const byId = new Map((products || []).map((product) => [product.id, product]));
  const number = `ADJ-${Date.now().toString().slice(-8)}`;
  const { data: adjustment, error } = await supabase
    .from("stock_adjustments")
    .insert({
      organization_id: organization.id,
      adjustment_number: number,
      reason: String(formData.get("reason") || "").trim() || "Stock correction",
      notes: String(formData.get("notes") || "").trim() || null,
      created_by: profile.id,
      created_by_name: actorName(profile),
    })
    .select("id")
    .single();
  if (error || !adjustment) return { error: error?.message || "Adjustment failed" };
  for (const line of lines) {
    const product = byId.get(line.product_id);
    if (!product) continue;
    const after = Number(product.quantity) + line.quantity;
    if (after < 0) return { error: `Insufficient stock for ${product.name}` };
    await supabase.from("stock_adjustment_lines").insert({
      adjustment_id: adjustment.id,
      product_id: product.id,
      quantity_before: Number(product.quantity),
      quantity_after: after,
      delta: line.quantity,
    });
    await supabase.from("products").update({ quantity: after }).eq("id", product.id);
    await supabase.from("stock_movements").insert({
      organization_id: organization.id,
      product_id: product.id,
      type: "adjust",
      quantity: Math.abs(line.quantity),
      note: `${number}: ${line.quantity > 0 ? "+" : ""}${line.quantity}`,
      created_by: profile.id,
    });
  }
  revalidateApp("/logistics", "/inventory", "/pos");
  return { success: true };
}

export async function createStockTransferAction(formData: FormData) {
  const { supabase, organization, profile } = await requireRetailMember();
  const lines = parseLines(formData);
  if (!lines?.length) return { error: "Add at least one transfer line" };
  const { data: products } = await supabase
    .from("products")
    .select("id, name, quantity")
    .eq("organization_id", organization.id)
    .in("id", lines.map((line) => line.product_id));
  const byId = new Map((products || []).map((product) => [product.id, product]));
  for (const line of lines) {
    const product = byId.get(line.product_id);
    if (!product || Number(product.quantity) < line.quantity) {
      return { error: `Insufficient stock for ${product?.name || "product"}` };
    }
  }
  const number = `TRF-${Date.now().toString().slice(-8)}`;
  const { data: transfer, error } = await supabase
    .from("stock_transfers")
    .insert({
      organization_id: organization.id,
      transfer_number: number,
      from_location: String(formData.get("from_location") || "main").trim(),
      to_location: String(formData.get("to_location") || "").trim(),
      status: "sent",
      notes: String(formData.get("notes") || "").trim() || null,
      created_by: profile.id,
      created_by_name: actorName(profile),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !transfer) return { error: error?.message || "Transfer failed" };
  await supabase.from("stock_transfer_lines").insert(
    lines.map((line) => ({
      transfer_id: transfer.id,
      product_id: line.product_id,
      name: byId.get(line.product_id)?.name || "Product",
      quantity: line.quantity,
    }))
  );
  // Stock stays inside the org (locations are labels, not separate pools), so
  // the global quantity must NOT change — deducting here silently lost stock.
  // The transfer document + lines above are the audit trail. To send stock OUT
  // of the business, use a stock adjustment instead.
  revalidateApp("/logistics", "/inventory", "/pos");
  return { success: true };
}

export async function savePrintSettingsAction(formData: FormData) {
  const { supabase, organization } = await requireRetailMember();
  const receiptConnection = String(formData.get("receipt_connection") || "browser");
  const stickerConnection = String(formData.get("sticker_connection") || "browser");
  const payload = {
    organization_id: organization.id,
    receipt_printer_name: String(formData.get("receipt_printer_name") || "").trim() || null,
    receipt_connection: ["browser", "bluetooth", "usb"].includes(receiptConnection)
      ? receiptConnection
      : "browser",
    receipt_design: {
      widthMm: Math.max(40, Math.min(120, Number(formData.get("receipt_width") || 80))),
      showLogo: formData.get("receipt_show_logo") === "on",
      showAddress: formData.get("receipt_show_address") === "on",
      footer: String(formData.get("receipt_footer") || "").slice(0, 200),
    },
    sticker_printer_name: String(formData.get("sticker_printer_name") || "").trim() || null,
    sticker_connection: ["browser", "bluetooth", "usb"].includes(stickerConnection)
      ? stickerConnection
      : "browser",
    sticker_design: {
      widthMm: Math.max(20, Math.min(100, Number(formData.get("sticker_width") || 40))),
      heightMm: Math.max(10, Math.min(100, Number(formData.get("sticker_height") || 30))),
      showName: formData.get("sticker_show_name") === "on",
      showPrice: formData.get("sticker_show_price") === "on",
      showBarcode: formData.get("sticker_show_barcode") === "on",
    },
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("print_settings").upsert(payload);
  if (error) return { error: error.message };
  revalidateApp("/printers");
  return { success: true };
}
