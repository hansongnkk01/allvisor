"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { isNiche } from "@/lib/niches";
import { getLhdnProvider } from "@/lib/lhdn";
import { canUseLhdn } from "@/lib/subscription";
import { revalidateApp, revalidateAppLayout } from "@/lib/revalidate";
import { logActivity } from "@/lib/activity";
import {
  defaultAdminPassword,
  hashAdminPassword,
  sectionCookieName,
  verifyAdminPassword,
  type LockedSection,
} from "@/lib/admin-lock";
import type {
  AppointmentStatus,
  InvoiceLineKind,
  InvoiceStatus,
  MembershipRole,
  PaymentMethod,
  SubscriptionPlan,
} from "@/lib/types";
import {
  parseDateTime,
  toNumber,
  type ImportKind,
  type ImportRow,
} from "@/lib/data-import";
import { canAccessSensitive, canManageStaff } from "@/lib/roles";

async function requireMember() {
  const ctx = await getOrgContext();
  if (!ctx) throw new Error("No organization");
  const supabase = await createClient();
  return { ...ctx, supabase };
}

async function requireAdminAccess() {
  const ctx = await requireMember();
  if (!canAccessSensitive(ctx.membership.role)) {
    throw new Error("Admin access required");
  }
  return ctx;
}

async function getServiceAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) return null;
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  return createAdminClient(url, serviceKey);
}

function legacyAdminCookieName(orgId: string) {
  return `allvisor_admin_${orgId}`;
}

export async function createOrganizationAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = String(formData.get("name") || "").trim();
  const niche = String(formData.get("niche") || "");
  const locale = String(formData.get("locale") || "ms");

  if (!name || !isNiche(niche)) return { error: "Invalid input" };

  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "Organization already exists" };
  }

  const { error: orgError } = await supabase.rpc("create_organization", {
    org_name: name,
    org_niche: niche,
    org_locale: locale,
  });

  if (orgError) return { error: orgError.message };

  revalidateApp("/dashboard");
  revalidateAppLayout();
  return { success: true };
}

export async function upsertCustomerAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();
  const id = String(formData.get("id") || "");
  const payload: Record<string, unknown> = {
    organization_id: organization.id,
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "") || null,
    phone: String(formData.get("phone") || "") || null,
    ic_number: String(formData.get("ic_number") || "").trim() || null,
    address: String(formData.get("address") || "").trim() || null,
    notes: String(formData.get("notes") || "") || null,
    risk_level: (["high", "medium", "low"].includes(String(formData.get("risk_level") || ""))
      ? String(formData.get("risk_level"))
      : null) as "high" | "medium" | "low" | null,
  };
  if (!payload.name) return { error: "Name required" };
  if (!payload.address) return { error: "Address required" };

  if (!id) {
    payload.created_by = profile.id;
    payload.created_by_name = profile.full_name || profile.email || "Staff";
  }

  const { data, error } = id
    ? await supabase.from("customers").update(payload).eq("id", id).select("id").single()
    : await supabase.from("customers").insert(payload).select("id").single();

  if (error) return { error: error.message };

  await logActivity({
    action: id ? "customer.update" : "customer.create",
    summary: id
      ? `Updated patient/customer: ${payload.name}`
      : `Registered patient/customer: ${payload.name}`,
    entityType: "customer",
    entityId: data?.id || id || null,
  });

  revalidateApp("/customers", "/dashboard", "/appointments", "/invoices", "/pos", "/staff", "/admin");
  return { success: true };
}

export async function deleteCustomerAction(id: string) {
  const { supabase, organization, profile } = await requireMember();
  const { data: customer } = await supabase
    .from("customers")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  if (customer) {
    await supabase.from("customer_deletions").insert({
      organization_id: organization.id,
      customer_id: id,
      customer_name: customer.name,
      deleted_by: profile.id,
      deleted_by_name: profile.full_name || profile.email || "Staff",
    });
  }

  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { error: error.message };

  await logActivity({
    action: "customer.delete",
    summary: `Deleted patient/customer: ${customer?.name || id}`,
    entityType: "customer",
    entityId: id,
  });

  revalidateApp("/customers", "/dashboard", "/appointments", "/invoices", "/staff", "/admin");
  return { success: true };
}

export async function upsertProductAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  const id = String(formData.get("id") || "");
  const payload = {
    organization_id: organization.id,
    name: String(formData.get("name") || "").trim(),
    sku: String(formData.get("sku") || "") || null,
    description: String(formData.get("description") || "") || null,
    unit_price: Number(formData.get("unit_price") || 0),
    cost_price: Number(formData.get("cost_price") || 0),
    quantity: Number(formData.get("quantity") || 0),
    low_stock_threshold: Number(formData.get("low_stock_threshold") || 5),
    is_active: true,
  };
  if (!payload.name) return { error: "Name required" };

  const { data, error } = id
    ? await supabase.from("products").update(payload).eq("id", id).select("id").single()
    : await supabase.from("products").insert(payload).select("id").single();

  if (error) return { error: error.message };

  await logActivity({
    action: id ? "inventory.update" : "inventory.add",
    summary: id
      ? `Updated inventory item: ${payload.name}`
      : `Added inventory item: ${payload.name} (qty ${payload.quantity})`,
    entityType: "product",
    entityId: data?.id || id || null,
  });

  revalidateApp("/inventory", "/pos", "/dashboard", "/staff");
  return { success: true };
}

export async function adjustStockAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();
  const productId = String(formData.get("product_id") || "");
  const type = String(formData.get("type") || "adjust") as "in" | "out" | "adjust";
  const quantity = Number(formData.get("quantity") || 0);
  const note = String(formData.get("note") || "") || null;

  if (!productId || !quantity) return { error: "Invalid stock adjustment" };

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();
  if (!product) return { error: "Product not found" };

  let nextQty = product.quantity;
  if (type === "in") nextQty += quantity;
  else if (type === "out" || type === "adjust") nextQty -= quantity;
  if (nextQty < 0) return { error: "Insufficient stock" };

  const { error: moveError } = await supabase.from("stock_movements").insert({
    organization_id: organization.id,
    product_id: productId,
    type,
    quantity,
    note,
    created_by: profile.id,
  });
  if (moveError) return { error: moveError.message };

  const { error } = await supabase
    .from("products")
    .update({ quantity: nextQty })
    .eq("id", productId);
  if (error) return { error: error.message };

  await logActivity({
    action: type === "in" ? "inventory.stock_in" : "inventory.stock_out",
    summary: `${type === "in" ? "Stock in" : "Stock out"} ${quantity} × ${product.name}`,
    entityType: "product",
    entityId: productId,
  });

  revalidateApp("/inventory", "/pos", "/dashboard", "/staff");
  return { success: true };
}

export async function bulkAdjustStockAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();
  const productIds = [...new Set(formData.getAll("product_ids").map(String).filter(Boolean))];
  const type = String(formData.get("type") || "in") as "in" | "out" | "adjust";
  const quantity = Number(formData.get("quantity") || 0);
  const note = String(formData.get("note") || "") || null;

  if (!productIds.length || !quantity) return { error: "Select at least one item and a quantity" };

  const { data: products, error: fetchErr } = await supabase
    .from("products")
    .select("id, name, quantity")
    .eq("organization_id", organization.id)
    .in("id", productIds);
  if (fetchErr) return { error: fetchErr.message };
  if (!products?.length) return { error: "No products found" };

  const byId = new Map(products.map((p) => [p.id, p]));
  const movements: Array<{
    organization_id: string;
    product_id: string;
    type: "in" | "out" | "adjust";
    quantity: number;
    note: string | null;
    created_by: string;
  }> = [];
  const updates: Array<{ id: string; quantity: number; name: string }> = [];

  for (const id of productIds) {
    const product = byId.get(id);
    if (!product) return { error: "Product not found" };
    let nextQty = Number(product.quantity);
    if (type === "in") nextQty += quantity;
    else nextQty -= quantity;
    if (nextQty < 0) return { error: `Insufficient stock for ${product.name}` };
    movements.push({
      organization_id: organization.id,
      product_id: id,
      type,
      quantity,
      note,
      created_by: profile.id,
    });
    updates.push({ id, quantity: nextQty, name: product.name });
  }

  const { error: moveError } = await supabase.from("stock_movements").insert(movements);
  if (moveError) return { error: moveError.message };

  // Parallel product updates (single round of network calls)
  const results = await Promise.all(
    updates.map((u) =>
      supabase.from("products").update({ quantity: u.quantity }).eq("id", u.id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  await logActivity({
    action: type === "in" ? "inventory.bulk_stock_in" : "inventory.bulk_stock_out",
    summary: `Bulk ${type} ×${quantity} on ${updates.length} item(s)`,
    entityType: "product",
    entityId: null,
  });

  revalidateApp("/inventory", "/pos", "/dashboard", "/staff");
  return { success: true };
}

/** Recalculate invoice totals + keep a single service_charge line in sync. */
async function syncInvoiceChargeAndTotals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  invoiceId: string,
  serviceChargePercent: number
) {
  const pct = Math.min(100, Math.max(0, Number(serviceChargePercent) || 0));
  const { data: lines, error: linesErr } = await supabase
    .from("invoice_lines")
    .select("id, description, line_total, line_kind")
    .eq("invoice_id", invoiceId);

  // If line_kind column missing, just sum all lines into totals
  if (linesErr && /line_kind/i.test(linesErr.message)) {
    const { data: plain } = await supabase
      .from("invoice_lines")
      .select("line_total")
      .eq("invoice_id", invoiceId);
    const base = (plain || []).reduce((s, l) => s + Number(l.line_total || 0), 0);
    const chargeAmt = Math.round(((base * pct) / 100) * 100) / 100;
    const { data: invoice } = await supabase
      .from("invoices")
      .select("tax_amount")
      .eq("id", invoiceId)
      .maybeSingle();
    const tax = Number(invoice?.tax_amount || 0);
    await supabase
      .from("invoices")
      .update({ subtotal: base, total: base + chargeAmt + tax })
      .eq("id", invoiceId);
    return;
  }

  const nonCharge = (lines || []).filter((l) => l.line_kind !== "service_charge");
  const base = nonCharge.reduce((s, l) => s + Number(l.line_total || 0), 0);
  const chargeAmt = Math.round(((base * pct) / 100) * 100) / 100;

  const chargeIds = (lines || [])
    .filter((l) => l.line_kind === "service_charge")
    .map((l) => l.id);
  if (chargeIds.length) {
    await supabase.from("invoice_lines").delete().in("id", chargeIds);
  }

  const { error: chargeErr } = await supabase.from("invoice_lines").insert({
    invoice_id: invoiceId,
    organization_id: organizationId,
    description: `Service charge (${pct}%)`,
    quantity: 1,
    unit_price: chargeAmt,
    line_total: chargeAmt,
    line_kind: "service_charge" as InvoiceLineKind,
  });
  if (chargeErr && /line_kind/i.test(chargeErr.message)) {
    // Skip charge line row; still bake amount into total
  }

  const medLines = nonCharge.filter((l) => l.line_kind === "medicine");
  const addLines = nonCharge.filter((l) => l.line_kind === "additional");
  const medAmt = medLines.reduce((s, l) => s + Number(l.line_total || 0), 0);
  const addAmt = addLines.reduce((s, l) => s + Number(l.line_total || 0), 0);
  // subtotal = bill lines only; service tax is applied on top before total
  const subtotal = base;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("tax_amount")
    .eq("id", invoiceId)
    .maybeSingle();
  const tax = Number(invoice?.tax_amount || 0);

  await supabase
    .from("invoices")
    .update({
      medicine_description:
        medLines.map((l) => l.description.replace(/^Medicine\s*\((.+)\)\s*$/i, "$1")).join("; ") ||
        null,
      medicine_amount: medAmt,
      additional_description:
        addLines
          .map((l) => l.description.replace(/^Additional\s*\((.+)\)\s*$/i, "$1"))
          .join("; ") || null,
      additional_amount: addAmt,
      subtotal,
      total: subtotal + chargeAmt + tax,
    })
    .eq("id", invoiceId);
}

export async function createInvoiceAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();
  const customerId = String(formData.get("customer_id") || "") || null;
  const taxAmount = Number(formData.get("tax_amount") || 0);
  const customNumber = String(formData.get("invoice_number") || "").trim();
  const title = String(formData.get("title") || "").trim() || null;
  const medicineDescription =
    String(formData.get("medicine_description") || "").trim() || null;
  const medicineAmount = Number(formData.get("medicine_amount") || 0);
  const additionalDescription =
    String(formData.get("additional_description") || "").trim() || null;
  const additionalAmount = Number(formData.get("additional_amount") || 0);

  let lines: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    product_id?: string | null;
    price_list_item_id?: string | null;
  }> = [];

  const linesJson = String(formData.get("lines_json") || "");
  if (linesJson) {
    try {
      const parsed = JSON.parse(linesJson) as Array<{
        description?: string;
        quantity?: number;
        unit_price?: number;
        product_id?: string | null;
        price_list_item_id?: string | null;
      }>;
      lines = parsed
        .map((line) => ({
          description: String(line.description || "").trim(),
          quantity: Number(line.quantity || 0),
          unit_price: Number(line.unit_price || 0),
          product_id: line.product_id || null,
          price_list_item_id: line.price_list_item_id || null,
        }))
        .filter((line) => line.description && line.quantity > 0);
    } catch {
      return { error: "Invalid invoice lines" };
    }
  }

  if (!lines.length) return { error: "Add at least one invoice line" };

  const servicesTotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.unit_price,
    0
  );
  const med = medicineAmount > 0 ? medicineAmount : 0;
  const add = additionalAmount > 0 ? additionalAmount : 0;
  const pct = Number(organization.service_charge_percent ?? 0);
  const chargeBase = servicesTotal + med + add;
  const chargeAmt = Math.round(((chargeBase * pct) / 100) * 100) / 100;
  const subtotal = chargeBase;
  const total = subtotal + chargeAmt + taxAmount;

  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  const invoiceNumber =
    customNumber ||
    `INV-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(5, "0")}`;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: organization.id,
      customer_id: customerId,
      invoice_number: invoiceNumber,
      title,
      status: "unpaid" as InvoiceStatus,
      subtotal,
      tax_amount: taxAmount,
      total,
      amount_paid: 0,
      medicine_description: med > 0 ? medicineDescription : null,
      medicine_amount: med,
      additional_description: add > 0 ? additionalDescription : null,
      additional_amount: add,
    })
    .select("*")
    .single();

  if (error || !invoice) return { error: error?.message || "Invoice failed" };

  const lineRows: Array<Record<string, unknown>> = lines.map((line) => ({
    invoice_id: invoice.id,
    organization_id: organization.id,
    product_id: line.product_id || null,
    price_list_item_id: line.price_list_item_id || null,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    line_total: line.quantity * line.unit_price,
    line_kind: "service" as InvoiceLineKind,
  }));
  if (med > 0) {
    lineRows.push({
      invoice_id: invoice.id,
      organization_id: organization.id,
      description: `Medicine (${medicineDescription || "Medicine"})`,
      quantity: 1,
      unit_price: med,
      line_total: med,
      line_kind: "medicine" as InvoiceLineKind,
    });
  }
  if (add > 0) {
    lineRows.push({
      invoice_id: invoice.id,
      organization_id: organization.id,
      description: `Additional (${additionalDescription || "Additional"})`,
      quantity: 1,
      unit_price: add,
      line_total: add,
      line_kind: "additional" as InvoiceLineKind,
    });
  }
  lineRows.push({
    invoice_id: invoice.id,
    organization_id: organization.id,
    description: `Service charge (${pct}%)`,
    quantity: 1,
    unit_price: chargeAmt,
    line_total: chargeAmt,
    line_kind: "service_charge" as InvoiceLineKind,
  });

  const { error: linesError } = await supabase.from("invoice_lines").insert(lineRows);

  if (linesError) return { error: linesError.message };

  await supabase.from("invoice_status_logs").insert({
    organization_id: organization.id,
    invoice_id: invoice.id,
    from_status: null,
    to_status: "unpaid",
    changed_by: profile.id,
    note: "Invoice created",
  });

  await logActivity({
    action: "invoice.create",
    summary: `Created invoice ${invoiceNumber}${title ? ` (${title})` : ""}`,
    entityType: "invoice",
    entityId: invoice.id,
  });

  revalidateApp("/invoices", "/dashboard", "/accounting", "/lhdn", "/staff");
  return { success: true, invoiceId: invoice.id };
}

export async function recordPaymentAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();
  const invoiceId = String(formData.get("invoice_id") || "");
  const amount = Number(formData.get("amount") || 0);
  const method = String(formData.get("method") || "cash") as PaymentMethod;

  if (!invoiceId || amount <= 0) return { error: "Invalid payment" };

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return { error: "Invoice not found" };

  const { error: payError } = await supabase.from("payments").insert({
    organization_id: organization.id,
    invoice_id: invoiceId,
    amount,
    method,
  });
  if (payError) return { error: payError.message };

  const amountPaid = Number(invoice.amount_paid) + amount;
  let status: InvoiceStatus = "partial";
  if (amountPaid >= Number(invoice.total)) status = "paid";
  else if (amountPaid <= 0) status = "unpaid";

  await supabase
    .from("invoices")
    .update({ amount_paid: amountPaid, status })
    .eq("id", invoiceId);

  if (invoice.status !== status) {
    await supabase.from("invoice_status_logs").insert({
      organization_id: organization.id,
      invoice_id: invoiceId,
      from_status: invoice.status,
      to_status: status,
      changed_by: profile.id,
      note: `Payment recorded (${method}) RM ${amount.toFixed(2)}`,
    });
  }

  if (status === "paid" || status === "partial") {
    await supabase.from("ledger_entries").insert({
      organization_id: organization.id,
      entry_type: "income",
      source: "payment",
      source_id: invoiceId,
      amount,
      entry_date: new Date().toISOString().slice(0, 10),
      description: `Payment for ${invoice.invoice_number}`,
    });
  }

  await logActivity({
    action: "invoice.payment",
    summary: `Recorded payment RM ${amount.toFixed(2)} for ${invoice.invoice_number}`,
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidateApp("/invoices", "/dashboard", "/accounting", "/staff");
  return { success: true };
}

export async function createAppointmentAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  const categoryId = String(formData.get("category_id") || "").trim();
  let title = String(formData.get("title") || "").trim();

  if (categoryId) {
    const { data: category } = await supabase
      .from("service_categories")
      .select("name")
      .eq("id", categoryId)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!category?.name) return { error: "Category not found" };
    title = category.name;
  }

  const payload = {
    organization_id: organization.id,
    customer_id: String(formData.get("customer_id") || ""),
    title,
    starts_at: new Date(String(formData.get("starts_at") || "")).toISOString(),
    ends_at: new Date(String(formData.get("ends_at") || "")).toISOString(),
    status: String(formData.get("status") || "scheduled") as AppointmentStatus,
    notes: String(formData.get("notes") || "") || null,
    reminder_sent: formData.get("reminder_sent") === "on",
  };

  if (
    !payload.customer_id ||
    !payload.title ||
    Number.isNaN(new Date(payload.starts_at).getTime()) ||
    Number.isNaN(new Date(payload.ends_at).getTime())
  ) {
    return { error: "Missing appointment fields" };
  }
  if (new Date(payload.ends_at).getTime() <= new Date(payload.starts_at).getTime()) {
    return { error: "End time must be after start time" };
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logActivity({
    action: "appointment.create",
    summary: `Booked appointment: ${payload.title}`,
    entityType: "appointment",
    entityId: data?.id || null,
  });

  revalidateApp("/appointments", "/dashboard", "/staff");
  return { success: true };
}

export async function updateAppointmentStatusAction(id: string, status: AppointmentStatus) {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) return { error: error.message };

  await logActivity({
    action: "appointment.status",
    summary: `Updated appointment status to ${status}`,
    entityType: "appointment",
    entityId: id,
  });

  revalidateApp("/appointments", "/dashboard", "/staff");
  return { success: true };
}

/** Mark appointment completed and create a pending (unpaid) invoice for follow-up. */
export async function completeAppointmentWithInvoiceAction(appointmentId: string): Promise<{
  error?: string;
  success?: boolean;
  invoiceId?: string;
}> {
  const { supabase, organization } = await requireMember();

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select("id, title, customer_id, notes, customers(name)")
    .eq("id", appointmentId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (apptErr || !appt) return { error: apptErr?.message || "Appointment not found" };

  const { error: statusErr } = await supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", appointmentId);
  if (statusErr) return { error: statusErr.message };

  // Avoid duplicate pending invoice for same appointment note tag
  const marker = `appt:${appointmentId}`;
  const { data: existingByNote } = await supabase
    .from("invoices")
    .select("id")
    .eq("organization_id", organization.id)
    .ilike("notes", `%${marker}%`)
    .maybeSingle();

  if (existingByNote?.id) {
    await logActivity({
      action: "appointment.complete",
      summary: `Completed appointment (invoice already exists)`,
      entityType: "appointment",
      entityId: appointmentId,
    });
    revalidateApp("/appointments", "/dashboard", "/invoices", "/staff");
    return { success: true, invoiceId: existingByNote.id };
  }

  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization.id);
  const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(5, "0")}`;

  const unitPrice = 0;
  const lineTotal = 0;
  const title = appt.title || "Consultation";

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      organization_id: organization.id,
      customer_id: appt.customer_id,
      invoice_number: invoiceNumber,
      title: `${title} · pending`,
      status: "unpaid",
      issue_date: new Date().toISOString().slice(0, 10),
      subtotal: lineTotal,
      tax_amount: 0,
      total: lineTotal,
      amount_paid: 0,
      notes: `${marker}${appt.notes ? ` · ${appt.notes}` : ""}`,
      medicine_description: null,
      medicine_amount: 0,
      additional_description: null,
      additional_amount: 0,
      lhdn_status: "not_submitted",
    })
    .select("id")
    .single();

  if (invErr || !invoice) return { error: invErr?.message || "Failed to create invoice" };

  // Prefer first active service under matching category name, else service named like title
  let price = 0;
  const { data: cat } = await supabase
    .from("service_categories")
    .select("id")
    .eq("organization_id", organization.id)
    .ilike("name", title)
    .maybeSingle();
  if (cat?.id) {
    const { data: catItem } = await supabase
      .from("service_items")
      .select("unit_price")
      .eq("organization_id", organization.id)
      .eq("category_id", cat.id)
      .eq("is_active", true)
      .order("unit_price", { ascending: false })
      .limit(1)
      .maybeSingle();
    price = Number(catItem?.unit_price || 0);
  }
  if (!price) {
    const { data: service } = await supabase
      .from("service_items")
      .select("unit_price")
      .eq("organization_id", organization.id)
      .ilike("name", title)
      .maybeSingle();
    price = Number(service?.unit_price || 0);
  }

  const finalPrice = price > 0 ? price : unitPrice;
  const linePayload: Record<string, unknown> = {
    invoice_id: invoice.id,
    organization_id: organization.id,
    description: title,
    quantity: 1,
    unit_price: finalPrice,
    line_total: finalPrice,
    line_kind: "service" as InvoiceLineKind,
  };
  let { error: lineErr } = await supabase.from("invoice_lines").insert(linePayload);
  // Fallback if migration 011 (line_kind) not applied yet
  if (lineErr && /line_kind/i.test(lineErr.message)) {
    delete linePayload.line_kind;
    const retry = await supabase.from("invoice_lines").insert(linePayload);
    lineErr = retry.error;
  }
  if (lineErr) {
    // Status already completed — still surface invoice line failure clearly
    return {
      error: `Appointment completed, but invoice line failed: ${lineErr.message}`,
      invoiceId: invoice.id,
    };
  }

  if (finalPrice > 0) {
    await supabase
      .from("invoices")
      .update({ subtotal: finalPrice, total: finalPrice })
      .eq("id", invoice.id);
  }

  const pct = Number(organization.service_charge_percent ?? 0);
  try {
    await syncInvoiceChargeAndTotals(supabase, organization.id, invoice.id, pct);
  } catch {
    // non-fatal — invoice already exists
  }

  await logActivity({
    action: "appointment.complete_invoice",
    summary: `Completed appointment → pending invoice ${invoiceNumber}`,
    entityType: "invoice",
    entityId: invoice.id,
  });

  revalidateApp("/appointments", "/dashboard", "/invoices", "/accounting", "/staff");
  return { success: true, invoiceId: invoice.id };
}

/** Add an optional medicine or additional cost line on a pending invoice. */
export async function addInvoiceCostAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  const invoiceId = String(formData.get("invoice_id") || "");
  const kindRaw = String(formData.get("cost_kind") || "medicine");
  const kind: InvoiceLineKind =
    kindRaw === "additional" ? "additional" : "medicine";
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);

  if (!invoiceId) return { error: "Missing invoice" };
  if (!description) return { error: "Description required" };
  if (!(amount > 0)) return { error: "Amount must be greater than 0" };

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === "paid" || invoice.status === "void") {
    return { error: "Cannot edit a paid/void invoice" };
  }

  const label = kind === "medicine" ? "Medicine" : "Additional";
  const { error } = await supabase.from("invoice_lines").insert({
    invoice_id: invoiceId,
    organization_id: organization.id,
    description: `${label} (${description})`,
    quantity: 1,
    unit_price: amount,
    line_total: amount,
    line_kind: kind,
  });
  if (error) return { error: error.message };

  const pct = Number(organization.service_charge_percent ?? 0);
  await syncInvoiceChargeAndTotals(supabase, organization.id, invoiceId, pct);

  await logActivity({
    action: "invoice.add_cost",
    summary: `Added ${kind} cost: ${description} (RM ${amount.toFixed(2)})`,
    entityType: "invoice",
    entityId: invoiceId,
  });

  // Narrow revalidate keeps Add cost clicks snappy
  revalidateApp("/invoices");
  return { success: true };
}

/** Remove a medicine/additional cost line (not product/service or service charge). */
export async function removeInvoiceLineAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  const invoiceId = String(formData.get("invoice_id") || "");
  const lineId = String(formData.get("line_id") || "");
  if (!invoiceId || !lineId) return { error: "Missing invoice/line" };

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === "paid" || invoice.status === "void") {
    return { error: "Cannot edit a paid/void invoice" };
  }

  const { data: line } = await supabase
    .from("invoice_lines")
    .select("id, line_kind, description")
    .eq("id", lineId)
    .eq("invoice_id", invoiceId)
    .maybeSingle();
  if (!line) return { error: "Line not found" };
  if (line.line_kind !== "medicine" && line.line_kind !== "additional") {
    return { error: "Only medicine/additional costs can be removed here" };
  }

  const { error } = await supabase.from("invoice_lines").delete().eq("id", lineId);
  if (error) return { error: error.message };

  const pct = Number(organization.service_charge_percent ?? 0);
  await syncInvoiceChargeAndTotals(supabase, organization.id, invoiceId, pct);

  await logActivity({
    action: "invoice.remove_cost",
    summary: `Removed cost line: ${line.description}`,
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidateApp("/invoices");
  return { success: true };
}

/** @deprecated use addInvoiceCostAction — kept for older forms */
export async function updateInvoiceExtrasAction(formData: FormData) {
  const kind = String(formData.get("medicine_amount") || "0") !== "0" ? "medicine" : "additional";
  const fd = new FormData();
  fd.set("invoice_id", String(formData.get("invoice_id") || ""));
  fd.set("cost_kind", kind === "medicine" ? "medicine" : "additional");
  if (kind === "medicine") {
    fd.set("description", String(formData.get("medicine_description") || "Medicine"));
    fd.set("amount", String(formData.get("medicine_amount") || 0));
  } else {
    fd.set("description", String(formData.get("additional_description") || "Additional"));
    fd.set("amount", String(formData.get("additional_amount") || 0));
  }
  return addInvoiceCostAction(fd);
}

export async function updateAppointmentAction(formData: FormData) {
  const { supabase } = await requireMember();
  const id = String(formData.get("id") || "");
  if (!id) return { error: "Missing appointment id" };

  const startsAt = String(formData.get("starts_at") || "");
  const endsAt = String(formData.get("ends_at") || "");
  const notes = String(formData.get("notes") || "").trim() || null;
  const status = String(formData.get("status") || "scheduled") as AppointmentStatus;

  if (!startsAt || !endsAt) return { error: "Start and end time required" };
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return { error: "End time must be after start time" };
  }
  if (!["scheduled", "confirmed", "completed", "cancelled", "no_show"].includes(status)) {
    return { error: "Invalid status" };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      notes,
      status,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await logActivity({
    action: "appointment.update",
    summary: `Updated appointment time ${startsAt} → ${endsAt}`,
    entityType: "appointment",
    entityId: id,
  });

  revalidateApp("/appointments", "/dashboard", "/staff");
  return { success: true };
}

export async function deleteAppointmentAction(id: string) {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return { error: error.message };

  await logActivity({
    action: "appointment.delete",
    summary: "Deleted appointment",
    entityType: "appointment",
    entityId: id,
  });

  revalidateApp("/appointments", "/dashboard", "/staff");
  return { success: true };
}

export async function posCheckoutAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();
  const productId = String(formData.get("product_id") || "");
  const quantity = Number(formData.get("quantity") || 1);
  const customerId = String(formData.get("customer_id") || "") || null;

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (!product) return { error: "Product not found" };
  if (product.quantity < quantity) return { error: "Insufficient stock" };

  const lineTotal = quantity * Number(product.unit_price);
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  const invoiceNumber = `INV-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(5, "0")}`;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: organization.id,
      customer_id: customerId,
      invoice_number: invoiceNumber,
      status: "paid",
      subtotal: lineTotal,
      tax_amount: 0,
      total: lineTotal,
      amount_paid: lineTotal,
    })
    .select("*")
    .single();

  if (error || !invoice) return { error: error?.message || "Checkout failed" };

  await supabase.from("invoice_lines").insert({
    invoice_id: invoice.id,
    organization_id: organization.id,
    product_id: product.id,
    description: product.name,
    quantity,
    unit_price: product.unit_price,
    line_total: lineTotal,
  });

  await supabase.from("payments").insert({
    organization_id: organization.id,
    invoice_id: invoice.id,
    amount: lineTotal,
    method: "cash",
  });

  await supabase.from("stock_movements").insert({
    organization_id: organization.id,
    product_id: product.id,
    type: "sale",
    quantity,
    note: `POS ${invoiceNumber}`,
    created_by: profile.id,
  });

  await supabase
    .from("products")
    .update({ quantity: product.quantity - quantity })
    .eq("id", product.id);

  await supabase.from("ledger_entries").insert({
    organization_id: organization.id,
    entry_type: "income",
    source: "pos",
    source_id: invoice.id,
    amount: lineTotal,
    entry_date: new Date().toISOString().slice(0, 10),
    description: `POS sale ${invoiceNumber}`,
  });

  await logActivity({
    action: "pos.checkout",
    summary: `POS sale ${invoiceNumber} · ${product.name} × ${quantity}`,
    entityType: "invoice",
    entityId: invoice.id,
  });

  revalidateApp("/pos", "/inventory", "/invoices", "/dashboard", "/accounting", "/staff");
  return { success: true, invoiceId: invoice.id };
}

export async function createExpenseAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "") || null;
  const amount = Number(formData.get("amount") || 0);
  const expenseDate = String(
    formData.get("expense_date") || new Date().toISOString().slice(0, 10)
  );

  if (!category || amount <= 0) return { error: "Invalid expense" };

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      organization_id: organization.id,
      category,
      description,
      amount,
      expense_date: expenseDate,
    })
    .select("*")
    .single();

  if (error || !expense) return { error: error?.message || "Failed" };

  await supabase.from("ledger_entries").insert({
    organization_id: organization.id,
    entry_type: "expense",
    source: "expense",
    source_id: expense.id,
    amount,
    entry_date: expenseDate,
    description: description || category,
  });

  await logActivity({
    action: "accounting.expense",
    summary: `Cash out RM ${amount.toFixed(2)} · ${category}`,
    entityType: "expense",
    entityId: expense.id,
  });

  revalidateApp("/accounting", "/dashboard", "/staff");
  return { success: true };
}

export async function createIncomeAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  const category = String(formData.get("category") || "").trim() || "Other income";
  const description = String(formData.get("description") || "").trim() || category;
  const amount = Number(formData.get("amount") || 0);
  const entryDate = String(
    formData.get("entry_date") || new Date().toISOString().slice(0, 10)
  );

  if (amount <= 0) return { error: "Invalid income amount" };

  const { data, error } = await supabase
    .from("ledger_entries")
    .insert({
      organization_id: organization.id,
      entry_type: "income",
      source: "manual",
      source_id: null,
      amount,
      entry_date: entryDate,
      description: `${category}: ${description}`,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logActivity({
    action: "accounting.income",
    summary: `Cash in RM ${amount.toFixed(2)} · ${category}`,
    entityType: "ledger",
    entityId: data?.id || null,
  });

  revalidateApp("/accounting", "/dashboard", "/staff");
  return { success: true };
}

export async function updateOrgSettingsAction(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (!canAccessSensitive(membership.role)) {
    return { error: "Forbidden — only owner/admin/supervisor/manager can update settings." };
  }

  const patch: Record<string, unknown> = {
    name: String(formData.get("name") || organization.name),
    phone: String(formData.get("phone") || "") || null,
    address: String(formData.get("address") || "") || null,
    tin: String(formData.get("tin") || "") || null,
    sst_number: String(formData.get("sst_number") || "") || null,
  };

  if (formData.has("lhdn_brn")) {
    patch.lhdn_brn = String(formData.get("lhdn_brn") || "").trim() || null;
  }

  if (formData.get("lhdn_link_present")) {
    const linked = formData.get("lhdn_intermediary_linked") === "1";
    patch.lhdn_intermediary_linked = linked;
    patch.lhdn_intermediary_linked_at = linked
      ? organization.lhdn_intermediary_linked_at || new Date().toISOString()
      : null;
  }

  // Service role bypasses orgs_update RLS (owner/admin only) so supervisor/manager can save TIN.
  const admin = await getServiceAdmin();
  const db = admin ?? supabase;

  const { data, error } = await db
    .from("organizations")
    .update(patch)
    .eq("id", organization.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (/lhdn_brn|lhdn_intermediary/i.test(error.message)) {
      return {
        error:
          "Database missing LHDN columns — run migration 012_lhdn_intermediary.sql in Supabase SQL Editor.",
      };
    }
    return { error: error.message };
  }
  if (!data) {
    return { error: "Could not save organization settings. Try again or contact support." };
  }
  revalidateApp("/settings", "/lhdn");
  revalidateAppLayout();
  return { success: true };
}

export async function upgradePlanAction(plan: SubscriptionPlan) {
  const { supabase, organization, membership } = await requireMember();
  if (membership.role === "staff") return { error: "Forbidden" };

  const unlocked = await isAdminUnlocked();
  if (!unlocked) return { error: "Admin unlock required" };

  const { error } = await supabase
    .from("organizations")
    .update({
      subscription_plan: plan,
      subscription_status: "active",
    })
    .eq("id", organization.id);

  if (error) return { error: error.message };

  await logActivity({
    action: "admin.upgrade_plan",
    summary: `Upgraded plan to ${plan}`,
    entityType: "organization",
    entityId: organization.id,
  });

  revalidateApp("/settings", "/lhdn", "/admin");
  revalidateAppLayout();
  return { success: true };
}

export async function addStaffAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canManageStaff(membership.role)) return { error: "Only admin can add staff" };

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "staff") as MembershipRole;
  const jobTitle = String(formData.get("job_title") || "").trim() || null;

  const allowedRoles: MembershipRole[] = ["admin", "supervisor", "manager", "staff"];
  if (!allowedRoles.includes(role)) return { error: "Invalid role" };
  if (!email) return { error: "Email required" };

  const admin = await getServiceAdmin();
  if (!admin) {
    return {
      error:
        "Staff invite requires SUPABASE_SERVICE_ROLE_KEY. Ask owner to configure env.",
    };
  }

  let userId: string | null = null;

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", email)
    .maybeSingle();

  if (existingProfile?.id) {
    userId = existingProfile.id;
    if (fullName) {
      await admin.from("profiles").update({ full_name: fullName, email }).eq("id", userId);
    }
  } else {
    if (!password || password.length < 6) {
      return { error: "Password (min 6) required for new staff accounts" };
    }
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        locale: organization.locale_default,
        account_type: "allvisor-staff",
      },
    });

    if (createError || !created.user) {
      // Email may exist in auth but not profiles yet — try list
      const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = listed?.users?.find(
        (u) => (u.email || "").toLowerCase() === email
      );
      if (!found) {
        return { error: createError?.message || "Failed to create staff user" };
      }
      userId = found.id;
      await admin.from("profiles").upsert({
        id: found.id,
        email,
        full_name: fullName || found.user_metadata?.full_name || null,
      });
    } else {
      userId = created.user.id;
      await admin.from("profiles").upsert({
        id: created.user.id,
        email,
        full_name: fullName || null,
      });
    }
  }

  if (!userId) return { error: "Could not resolve staff user" };

  const { data: existingMembership } = await supabase
    .from("memberships")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMembership) {
    return { error: "This user is already a member of this clinic" };
  }

  const { error } = await supabase.from("memberships").insert({
    organization_id: organization.id,
    user_id: userId,
    role,
    job_title: jobTitle,
  });

  if (error) return { error: error.message };

  await logActivity({
    action: "staff.add",
    summary: `Added staff ${fullName || email} as ${jobTitle || role} (by ${profile.full_name || profile.email})`,
    entityType: "membership",
    entityId: userId,
  });

  revalidateApp("/staff", "/admin");
  return { success: true };
}

export async function kickStaffAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canManageStaff(membership.role)) return { error: "Only admin can kick staff" };

  const membershipId = String(formData.get("membership_id") || "");
  if (!membershipId) return { error: "Missing member" };

  const { data: target } = await supabase
    .from("memberships")
    .select("*, profiles(full_name, email)")
    .eq("id", membershipId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!target) return { error: "Member not found" };
  if (target.role === "owner") return { error: "Cannot kick owner" };
  if (target.user_id === profile.id) return { error: "Cannot kick yourself" };

  const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
  if (error) return { error: error.message };

  await logActivity({
    action: "staff.kick",
    summary: `Removed staff ${target.profiles?.full_name || target.profiles?.email || target.user_id}`,
    entityType: "membership",
    entityId: target.user_id,
  });

  revalidateApp("/staff", "/admin");
  return { success: true };
}

export async function requestBranchLinkAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canManageStaff(membership.role)) return { error: "Only admin can link branches" };

  const branchName = String(formData.get("branch_name") || "").trim();
  if (!branchName) return { error: "Branch name required" };
  if (branchName.toLowerCase() === organization.name.toLowerCase()) {
    return { error: "Cannot link to the same clinic" };
  }

  const admin = await getServiceAdmin();
  if (!admin) return { error: "Service role required to find other clinics" };

  const { data: target } = await admin
    .from("organizations")
    .select("id, name")
    .ilike("name", branchName)
    .maybeSingle();

  if (!target) {
    return { error: `No Allvisor clinic found with name "${branchName}"` };
  }

  const { data: already } = await supabase
    .from("branch_links")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("linked_organization_id", target.id)
    .maybeSingle();
  if (already) return { error: "Already linked" };

  const { error } = await supabase.from("branch_link_requests").upsert(
    {
      from_organization_id: organization.id,
      to_organization_id: target.id,
      requested_by: profile.id,
      status: "pending",
    },
    { onConflict: "from_organization_id,to_organization_id" }
  );

  if (error) return { error: error.message };

  await logActivity({
    action: "branch.request",
    summary: `Requested link to branch "${target.name}"`,
    entityType: "organization",
    entityId: target.id,
  });

  revalidateApp("/admin");
  return { success: true };
}

export async function respondBranchLinkAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canManageStaff(membership.role)) return { error: "Only admin can approve links" };

  const requestId = String(formData.get("request_id") || "");
  const decision = String(formData.get("decision") || "") as "approved" | "rejected";
  if (!requestId || !["approved", "rejected"].includes(decision)) {
    return { error: "Invalid decision" };
  }

  const { data: req } = await supabase
    .from("branch_link_requests")
    .select("*")
    .eq("id", requestId)
    .eq("to_organization_id", organization.id)
    .eq("status", "pending")
    .maybeSingle();

  if (!req) return { error: "Request not found" };

  const { error: updError } = await supabase
    .from("branch_link_requests")
    .update({ status: decision })
    .eq("id", requestId);
  if (updError) return { error: updError.message };

  if (decision === "approved") {
    await supabase.from("branch_links").upsert([
      {
        organization_id: req.from_organization_id,
        linked_organization_id: req.to_organization_id,
      },
      {
        organization_id: req.to_organization_id,
        linked_organization_id: req.from_organization_id,
      },
    ]);
  }

  await logActivity({
    action: decision === "approved" ? "branch.approve" : "branch.reject",
    summary: `${decision} branch link request (${profile.full_name || profile.email})`,
    entityType: "organization",
    entityId: req.from_organization_id,
  });

  revalidateApp("/admin");
  return { success: true };
}

export async function upsertBranchServiceCategoryAction(formData: FormData) {
  const { membership } = await requireAdminAccess();
  if (!canManageStaff(membership.role) && membership.role !== "supervisor") {
    return { error: "Forbidden" };
  }
  const targetOrgId = String(formData.get("target_org_id") || "");
  const admin = await getServiceAdmin();
  if (!admin || !targetOrgId) return { error: "Invalid branch target" };

  // verify link or own org
  const ctx = await requireMember();
  const allowed =
    targetOrgId === ctx.organization.id ||
    (
      await ctx.supabase
        .from("branch_links")
        .select("id")
        .eq("organization_id", ctx.organization.id)
        .eq("linked_organization_id", targetOrgId)
        .maybeSingle()
    ).data;
  if (!allowed) return { error: "Branch not linked" };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Category name required" };
  const { error } = await admin.from("service_categories").insert({
    organization_id: targetOrgId,
    name,
    description: String(formData.get("description") || "").trim() || null,
  });
  if (error) return { error: error.message };
  revalidateApp("/admin", "/invoices");
  return { success: true };
}

export async function upsertBranchServiceItemAction(formData: FormData) {
  await requireAdminAccess();
  const targetOrgId = String(formData.get("target_org_id") || "");
  const categoryId = String(formData.get("category_id") || "");
  const admin = await getServiceAdmin();
  if (!admin || !targetOrgId || !categoryId) return { error: "Invalid input" };

  const ctx = await requireMember();
  const allowed =
    targetOrgId === ctx.organization.id ||
    (
      await ctx.supabase
        .from("branch_links")
        .select("id")
        .eq("organization_id", ctx.organization.id)
        .eq("linked_organization_id", targetOrgId)
        .maybeSingle()
    ).data;
  if (!allowed) return { error: "Branch not linked" };

  const { data: category } = await admin
    .from("service_categories")
    .select("name")
    .eq("id", categoryId)
    .maybeSingle();

  const { error } = await admin.from("service_items").insert({
    organization_id: targetOrgId,
    name: String(formData.get("name") || "").trim(),
    category_id: categoryId,
    category: category?.name || "General",
    unit_price: Number(formData.get("unit_price") || 0),
    description: String(formData.get("description") || "") || null,
    is_active: true,
  });
  if (error) return { error: error.message };
  revalidateApp("/admin", "/invoices");
  return { success: true };
}

export async function addBranchStaffAction(formData: FormData) {
  const { membership } = await requireMember();
  if (!canManageStaff(membership.role)) return { error: "Only admin" };
  // reuse same org targeting via target_org_id by temporarily switching insert org
  const targetOrgId = String(formData.get("target_org_id") || "");
  if (!targetOrgId) return { error: "Missing branch" };

  // Force organization_id in form by cloning into addStaff with service role membership insert
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "staff") as MembershipRole;
  const jobTitle = String(formData.get("job_title") || "").trim() || null;

  const ctx = await requireMember();
  const linked =
    targetOrgId === ctx.organization.id ||
    (
      await ctx.supabase
        .from("branch_links")
        .select("id")
        .eq("organization_id", ctx.organization.id)
        .eq("linked_organization_id", targetOrgId)
        .maybeSingle()
    ).data;
  if (!linked) return { error: "Branch not linked" };

  const admin = await getServiceAdmin();
  if (!admin) return { error: "Service role required" };

  let userId: string | null = null;
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existingProfile?.id) {
    userId = existingProfile.id;
  } else {
    if (!password || password.length < 6) return { error: "Password required for new user" };
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, account_type: "allvisor-staff" },
    });
    if (createError || !created.user) {
      const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = listed?.users?.find((u) => (u.email || "").toLowerCase() === email);
      if (!found) return { error: createError?.message || "Create failed" };
      userId = found.id;
    } else {
      userId = created.user.id;
    }
  }

  const { error } = await admin.from("memberships").insert({
    organization_id: targetOrgId,
    user_id: userId,
    role: role === "owner" ? "admin" : role,
    job_title: jobTitle,
  });
  if (error) return { error: error.message };
  revalidateApp("/admin");
  return { success: true };
}

export async function kickBranchStaffAction(formData: FormData) {
  const { membership } = await requireMember();
  if (!canManageStaff(membership.role)) return { error: "Only admin" };
  const membershipId = String(formData.get("membership_id") || "");
  const targetOrgId = String(formData.get("target_org_id") || "");
  const admin = await getServiceAdmin();
  if (!admin) return { error: "Service role required" };

  const ctx = await requireMember();
  const linked =
    targetOrgId === ctx.organization.id ||
    (
      await ctx.supabase
        .from("branch_links")
        .select("id")
        .eq("organization_id", ctx.organization.id)
        .eq("linked_organization_id", targetOrgId)
        .maybeSingle()
    ).data;
  if (!linked) return { error: "Branch not linked" };

  const { data: target } = await admin
    .from("memberships")
    .select("role, user_id")
    .eq("id", membershipId)
    .eq("organization_id", targetOrgId)
    .maybeSingle();
  if (!target || target.role === "owner") return { error: "Cannot remove" };

  const { error } = await admin.from("memberships").delete().eq("id", membershipId);
  if (error) return { error: error.message };
  revalidateApp("/admin");
  return { success: true };
}

export async function submitInvoiceToLhdnAction(invoiceId: string) {
  const { supabase, organization } = await requireMember();

  if (!canUseLhdn(organization.subscription_plan, organization.subscription_status)) {
    return { error: "Plan does not include LHDN e-Invoice" };
  }
  if (!organization.tin) return { error: "Set company TIN in LHDN settings first" };

  const mode = (process.env.LHDN_MODE || "intermediary").toLowerCase();
  const hasCreds = Boolean(
    process.env.LHDN_CLIENT_ID && process.env.LHDN_CLIENT_SECRET
  );
  if (
    hasCreds &&
    mode !== "taxpayer" &&
    !organization.lhdn_intermediary_linked
  ) {
    return {
      error:
        "Authorize Allvisor as intermediary in MyInvois, then tick the confirmation on the LHDN page.",
    };
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, customers(*), invoice_lines(*)")
    .eq("id", invoiceId)
    .single();

  if (!invoice) return { error: "Invoice not found" };

  const provider = getLhdnProvider();
  const result = await provider.submitInvoice({
    invoiceNumber: invoice.invoice_number,
    issueDate: invoice.issue_date,
    supplierTin: organization.tin,
    supplierBrn: organization.lhdn_brn || null,
    supplierName: organization.name,
    buyerName: invoice.customers?.name || "Walk-in",
    buyerTin: null,
    total: Number(invoice.total),
    taxAmount: Number(invoice.tax_amount),
    lines: (invoice.invoice_lines || []).map(
      (line: {
        description: string;
        quantity: number;
        unit_price: number;
        line_total: number;
      }) => ({
        description: line.description,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unit_price),
        lineTotal: Number(line.line_total),
      })
    ),
  });

  const status = result.success ? result.status : "rejected";

  await supabase.from("lhdn_submissions").insert({
    organization_id: organization.id,
    invoice_id: invoiceId,
    status,
    uuid: result.uuid || null,
    payload: {
      invoiceNumber: invoice.invoice_number,
      total: invoice.total,
    },
    response: result.response,
    submitted_at: new Date().toISOString(),
  });

  await supabase
    .from("invoices")
    .update({ lhdn_status: status })
    .eq("id", invoiceId);

  await logActivity({
    action: "lhdn.submit",
    summary: `Submitted ${invoice.invoice_number} to LHDN (${status})`,
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidateApp("/lhdn", "/invoices", "/staff");
  return result.success
    ? { success: true, uuid: result.uuid }
    : {
        error:
          typeof result.error === "string"
            ? result.error
            : result.error
              ? JSON.stringify(result.error)
              : "LHDN submission failed",
      };
}

/**
 * Status change adds a NEW invoice list row (same name/title) with the new status,
 * instead of only mutating the original. Invoice numbers stay unique via suffix.
 */
export async function updateInvoiceStatusAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();
  const invoiceId = String(formData.get("invoice_id") || "");
  const toStatus = String(formData.get("status") || "") as InvoiceStatus;
  const note = String(formData.get("note") || "").trim() || null;

  const allowed: InvoiceStatus[] = ["draft", "unpaid", "partial", "paid", "void"];
  if (!invoiceId || !allowed.includes(toStatus)) {
    return { error: "Invalid status update" };
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, invoice_lines(*)")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === toStatus) return { success: true };

  const suffix = `${toStatus}-${Date.now().toString(36)}`;
  const snapshotNumber = `${invoice.invoice_number}-${suffix}`;
  const title = invoice.title || invoice.invoice_number;

  const { data: snapshot, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: organization.id,
      customer_id: invoice.customer_id,
      invoice_number: snapshotNumber,
      title,
      status: toStatus,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      total: invoice.total,
      amount_paid: toStatus === "paid" ? invoice.total : invoice.amount_paid,
      notes: note || `Status snapshot from ${invoice.status} → ${toStatus}`,
      lhdn_status: "not_submitted",
    })
    .select("*")
    .single();

  if (error || !snapshot) return { error: error?.message || "Failed to add status row" };

  const lines = (invoice.invoice_lines || []) as Array<{
    product_id: string | null;
    price_list_item_id?: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;

  if (lines.length) {
    await supabase.from("invoice_lines").insert(
      lines.map((line) => ({
        invoice_id: snapshot.id,
        organization_id: organization.id,
        product_id: line.product_id,
        price_list_item_id: line.price_list_item_id || null,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total: line.line_total,
      }))
    );
  }

  await supabase.from("invoice_status_logs").insert({
    organization_id: organization.id,
    invoice_id: snapshot.id,
    from_status: invoice.status,
    to_status: toStatus,
    changed_by: profile.id,
    note: note || `List snapshot: ${invoice.status} → ${toStatus}`,
  });

  if (toStatus === "paid" && Number(invoice.amount_paid) < Number(invoice.total)) {
    const remaining = Number(invoice.total) - Number(invoice.amount_paid);
    if (remaining > 0) {
      await supabase.from("ledger_entries").insert({
        organization_id: organization.id,
        entry_type: "income",
        source: "invoice_status",
        source_id: snapshot.id,
        amount: remaining,
        entry_date: new Date().toISOString().slice(0, 10),
        description: `Marked paid · ${title}`,
      });
    }
  }

  await logActivity({
    action: "invoice.status",
    summary: `Added invoice list row "${title}" as ${toStatus}`,
    entityType: "invoice",
    entityId: snapshot.id,
  });

  revalidateApp("/invoices", "/dashboard", "/accounting", "/staff");
  return { success: true, invoiceId: snapshot.id };
}

export async function logInvoicePrintAction(invoiceId: string) {
  await logActivity({
    action: "invoice.print",
    summary: `Printed invoice`,
    entityType: "invoice",
    entityId: invoiceId,
  });
  return { success: true };
}

export async function upsertServiceItemAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  const unlocked = await isAdminUnlocked();
  if (!unlocked) return { error: "Admin unlock required" };

  const id = String(formData.get("id") || "");
  const categoryId = String(formData.get("category_id") || "") || null;
  if (!categoryId) return { error: "Category required" };

  const { data: category } = await supabase
    .from("service_categories")
    .select("name")
    .eq("id", categoryId)
    .maybeSingle();

  const payload = {
    organization_id: organization.id,
    name: String(formData.get("name") || "").trim(),
    category_id: categoryId,
    category: category?.name || "General",
    unit_price: Number(formData.get("unit_price") || 0),
    description: String(formData.get("description") || "") || null,
    is_active: formData.get("is_active") !== "off",
  };
  if (!payload.name) return { error: "Name required" };

  const { error } = id
    ? await supabase.from("service_items").update(payload).eq("id", id)
    : await supabase.from("service_items").insert(payload);
  if (error) return { error: error.message };

  revalidateApp("/admin", "/invoices");
  return { success: true };
}

export async function deleteServiceItemAction(id: string) {
  const { supabase } = await requireMember();
  const unlocked = await isAdminUnlocked();
  if (!unlocked) return { error: "Admin unlock required" };
  const { error } = await supabase.from("service_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateApp("/admin", "/invoices");
  return { success: true };
}

export async function upsertServiceCategoryAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  const unlocked = await isAdminUnlocked();
  if (!unlocked) return { error: "Admin unlock required" };
  const id = String(formData.get("id") || "");
  const payload = {
    organization_id: organization.id,
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim() || null,
  };
  if (!payload.name) return { error: "Category name required" };

  const { error } = id
    ? await supabase.from("service_categories").update(payload).eq("id", id)
    : await supabase.from("service_categories").insert(payload);
  if (error) return { error: error.message };

  revalidateApp("/admin", "/invoices");
  return { success: true };
}

export async function deleteServiceCategoryAction(id: string) {
  const { supabase } = await requireMember();
  const unlocked = await isAdminUnlocked();
  if (!unlocked) return { error: "Admin unlock required" };
  const { error } = await supabase.from("service_categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateApp("/admin", "/invoices");
  return { success: true };
}

export async function upsertPriceListItemAction(formData: FormData) {
  void formData;
  return { error: "Use Admin → Items/Services to set prices" };
}

export async function deletePriceListItemAction(id: string) {
  void id;
  return { error: "Use Admin → Items/Services to manage prices" };
}

export async function isSectionUnlocked(section: LockedSection) {
  const ctx = await getOrgContext();
  if (!ctx) return false;
  const jar = await cookies();
  if (jar.get(sectionCookieName(ctx.organization.id, section))?.value === "1") {
    return true;
  }
  // backward compat for admin cookie name
  if (section === "admin") {
    return jar.get(legacyAdminCookieName(ctx.organization.id))?.value === "1";
  }
  return false;
}

export async function isAdminUnlocked() {
  return isSectionUnlocked("admin");
}

export async function unlockSectionAction(formData: FormData) {
  const { organization, membership } = await requireMember();
  if (!canAccessSensitive(membership.role)) {
    return { error: "Only admin / supervisor / manager can unlock this section" };
  }

  const section = String(formData.get("section") || "admin") as LockedSection;
  if (!["admin", "accounting", "lhdn"].includes(section)) {
    return { error: "Invalid section" };
  }

  const password = String(formData.get("password") || "");
  const ok = verifyAdminPassword(
    password,
    organization.admin_password_hash,
    organization.name,
    organization.created_at
  );
  if (!ok) return { error: "Wrong password" };

  const jar = await cookies();
  jar.set(sectionCookieName(organization.id, section), "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  if (section === "admin") {
    jar.set(legacyAdminCookieName(organization.id), "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }

  revalidateApp(`/${section === "lhdn" ? "lhdn" : section}`);
  return { success: true };
}

export async function unlockAdminAction(formData: FormData) {
  formData.set("section", "admin");
  return unlockSectionAction(formData);
}

export async function changeAdminPasswordAction(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (!canManageStaff(membership.role)) return { error: "Forbidden" };
  const unlocked = await isSectionUnlocked("admin");
  if (!unlocked) return { error: "Admin unlock required" };

  const next = String(formData.get("new_password") || "").trim();
  if (next.length < 6) return { error: "Password min 6 characters" };

  const { error } = await supabase
    .from("organizations")
    .update({ admin_password_hash: hashAdminPassword(next) })
    .eq("id", organization.id);
  if (error) return { error: error.message };

  await logActivity({
    action: "admin.password",
    summary: "Changed admin page password",
    entityType: "organization",
    entityId: organization.id,
  });

  revalidateApp("/admin");
  return { success: true };
}

export async function getDefaultAdminPasswordHint() {
  const ctx = await getOrgContext();
  if (!ctx) return "";
  if (ctx.organization.admin_password_hash) return "(custom password set)";
  return defaultAdminPassword(ctx.organization.name, ctx.organization.created_at);
}

export async function updateClinicHoursAction(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (!canManageStaff(membership.role) && membership.role !== "supervisor") {
    return { error: "Forbidden" };
  }
  const unlocked = await isSectionUnlocked("admin");
  if (!unlocked) return { error: "Admin unlock required" };

  const openHour = Number(formData.get("clinic_open_hour") ?? 0);
  const closeHour = Number(formData.get("clinic_close_hour") ?? 23);
  const closedRaw = formData.getAll("closed_weekdays").map((v) => Number(v));
  const closedWeekdays = closedRaw.filter((n) => n >= 0 && n <= 6);

  if (
    Number.isNaN(openHour) ||
    Number.isNaN(closeHour) ||
    openHour < 0 ||
    openHour > 23 ||
    closeHour < 0 ||
    closeHour > 23
  ) {
    return { error: "Invalid hours" };
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      clinic_open_hour: openHour,
      clinic_close_hour: closeHour,
      closed_weekdays: closedWeekdays,
    })
    .eq("id", organization.id);

  if (error) return { error: error.message };

  await logActivity({
    action: "admin.clinic_hours",
    summary: `Updated clinic hours ${String(openHour).padStart(2, "0")}:00–${String(closeHour).padStart(2, "0")}:00`,
    entityType: "organization",
    entityId: organization.id,
  });

  revalidateApp("/admin", "/dashboard", "/appointments");
  revalidateAppLayout();
  return { success: true };
}

export async function updateServiceChargeAction(formData: FormData) {
  const { supabase, organization } = await requireAdminAccess();
  const unlocked = await isSectionUnlocked("admin");
  if (!unlocked) return { error: "Admin unlock required" };

  const pct = Number(formData.get("service_charge_percent") || 0);
  if (Number.isNaN(pct) || pct < 0 || pct > 100) {
    return { error: "Service charge must be between 0 and 100%" };
  }

  const { error } = await supabase
    .from("organizations")
    .update({ service_charge_percent: pct })
    .eq("id", organization.id);
  if (error) return { error: error.message };

  await logActivity({
    action: "admin.service_charge",
    summary: `Set service charge to ${pct}%`,
    entityType: "organization",
    entityId: organization.id,
  });

  revalidateApp("/admin", "/invoices", "/dashboard");
  revalidateAppLayout();
  return { success: true };
}

export async function importMigrationDataAction(
  kind: ImportKind,
  rows: ImportRow[]
): Promise<{
  error?: string;
  success?: boolean;
  inserted?: number;
  skipped?: number;
  errors?: { row: number; message: string }[];
}> {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canManageStaff(membership.role) && membership.role !== "supervisor") {
    return { error: "Forbidden" };
  }
  const unlocked = await isSectionUnlocked("admin");
  if (!unlocked) return { error: "Admin unlock required" };

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "No rows to import" };
  }
  if (rows.length > 2000) {
    return { error: "Max 2000 rows per import. Split the file and try again." };
  }

  const errors: { row: number; message: string }[] = [];
  let inserted = 0;
  let skipped = 0;
  const actor = profile.full_name || profile.email || "Staff";

  if (kind === "patients") {
    const payloads = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = String(r.name || "").trim();
      if (!name) {
        skipped++;
        errors.push({ row: i + 2, message: "Name required" });
        continue;
      }
      const risk = String(r.risk_level || "").toLowerCase();
      payloads.push({
        organization_id: organization.id,
        name,
        ic_number: String(r.ic_number || "").trim() || null,
        phone: String(r.phone || "").trim() || null,
        email: String(r.email || "").trim() || null,
        address: String(r.address || "").trim() || null,
        notes: String(r.notes || "").trim() || null,
        risk_level: (["high", "medium", "low"].includes(risk)
          ? risk
          : null) as "high" | "medium" | "low" | null,
        created_by: profile.id,
        created_by_name: actor,
      });
    }
    for (let i = 0; i < payloads.length; i += 100) {
      const chunk = payloads.slice(i, i + 100);
      const { error } = await supabase.from("customers").insert(chunk);
      if (error) return { error: error.message, inserted, skipped, errors };
      inserted += chunk.length;
    }
  } else if (kind === "products") {
    const payloads = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = String(r.name || "").trim();
      if (!name) {
        skipped++;
        errors.push({ row: i + 2, message: "Name required" });
        continue;
      }
      payloads.push({
        organization_id: organization.id,
        name,
        sku: String(r.sku || "").trim() || null,
        description: String(r.description || "").trim() || null,
        unit_price: toNumber(r.unit_price),
        cost_price: toNumber(r.cost_price),
        quantity: Math.round(toNumber(r.quantity)),
        low_stock_threshold: Math.round(toNumber(r.low_stock_threshold, 5)),
        is_active: true,
      });
    }
    for (let i = 0; i < payloads.length; i += 100) {
      const chunk = payloads.slice(i, i + 100);
      const { error } = await supabase.from("products").insert(chunk);
      if (error) return { error: error.message, inserted, skipped, errors };
      inserted += chunk.length;
    }
  } else if (kind === "service_categories") {
    const payloads = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = String(r.name || "").trim();
      if (!name) {
        skipped++;
        errors.push({ row: i + 2, message: "Category name required" });
        continue;
      }
      payloads.push({
        organization_id: organization.id,
        name,
        description: String(r.description || "").trim() || null,
      });
    }
    for (let i = 0; i < payloads.length; i += 100) {
      const chunk = payloads.slice(i, i + 100);
      const { error } = await supabase.from("service_categories").insert(chunk);
      if (error) return { error: error.message, inserted, skipped, errors };
      inserted += chunk.length;
    }
  } else if (kind === "service_items") {
    const { data: cats } = await supabase
      .from("service_categories")
      .select("id, name")
      .eq("organization_id", organization.id);
    const byName = new Map(
      (cats || []).map((c) => [c.name.trim().toLowerCase(), c] as const)
    );
    const payloads = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = String(r.name || "").trim();
      const catName = String(r.category || "").trim();
      if (!name) {
        skipped++;
        errors.push({ row: i + 2, message: "Service name required" });
        continue;
      }
      if (!catName) {
        skipped++;
        errors.push({ row: i + 2, message: "Category required" });
        continue;
      }
      const cat = byName.get(catName.toLowerCase());
      if (!cat) {
        skipped++;
        errors.push({ row: i + 2, message: `Category not found: ${catName}` });
        continue;
      }
      payloads.push({
        organization_id: organization.id,
        name,
        category_id: cat.id,
        category: cat.name,
        unit_price: toNumber(r.unit_price),
        description: String(r.description || "").trim() || null,
        is_active: true,
      });
    }
    for (let i = 0; i < payloads.length; i += 100) {
      const chunk = payloads.slice(i, i + 100);
      const { error } = await supabase.from("service_items").insert(chunk);
      if (error) return { error: error.message, inserted, skipped, errors };
      inserted += chunk.length;
    }
  } else if (kind === "appointments") {
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, ic_number, phone")
      .eq("organization_id", organization.id);
    const { data: cats } = await supabase
      .from("service_categories")
      .select("id, name")
      .eq("organization_id", organization.id);

    const byIc = new Map(
      (customers || [])
        .filter((c) => c.ic_number)
        .map((c) => [c.ic_number!.trim().toLowerCase(), c.id] as const)
    );
    const byPhone = new Map(
      (customers || [])
        .filter((c) => c.phone)
        .map((c) => [c.phone!.replace(/\D/g, ""), c.id] as const)
    );
    const byName = new Map(
      (customers || []).map((c) => [c.name.trim().toLowerCase(), c.id] as const)
    );
    const catByName = new Map(
      (cats || []).map((c) => [c.name.trim().toLowerCase(), c.name] as const)
    );

    const payloads = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const patientName = String(r.patient_name || "").trim();
      const patientIc = String(r.patient_ic || "").trim().toLowerCase();
      const patientPhone = String(r.patient_phone || "").replace(/\D/g, "");
      let customerId =
        (patientIc && byIc.get(patientIc)) ||
        (patientPhone && byPhone.get(patientPhone)) ||
        (patientName && byName.get(patientName.toLowerCase())) ||
        null;

      if (!customerId) {
        skipped++;
        errors.push({
          row: i + 2,
          message: `Patient not found (${patientName || patientIc || patientPhone || "—"})`,
        });
        continue;
      }

      const catName = String(r.category || "").trim();
      const title = (catName && catByName.get(catName.toLowerCase())) || catName;
      if (!title) {
        skipped++;
        errors.push({ row: i + 2, message: "Category / title required" });
        continue;
      }

      const starts = parseDateTime(r.starts_at);
      const ends = parseDateTime(r.ends_at) || (starts ? new Date(new Date(starts).getTime() + 30 * 60000).toISOString() : null);
      if (!starts || !ends) {
        skipped++;
        errors.push({ row: i + 2, message: "Invalid starts_at / ends_at" });
        continue;
      }

      const statusRaw = String(r.status || "scheduled").toLowerCase().replace(/\s+/g, "_");
      const status = (
        ["scheduled", "confirmed", "completed", "cancelled", "no_show"].includes(statusRaw)
          ? statusRaw
          : "scheduled"
      ) as AppointmentStatus;

      payloads.push({
        organization_id: organization.id,
        customer_id: customerId,
        title,
        starts_at: starts,
        ends_at: ends,
        status,
        notes: String(r.notes || "").trim() || null,
        reminder_sent: false,
      });
    }
    for (let i = 0; i < payloads.length; i += 100) {
      const chunk = payloads.slice(i, i + 100);
      const { error } = await supabase.from("appointments").insert(chunk);
      if (error) return { error: error.message, inserted, skipped, errors };
      inserted += chunk.length;
    }
  } else {
    return { error: "Unknown import type" };
  }

  await logActivity({
    action: "admin.data_import",
    summary: `Imported ${inserted} ${kind} row(s) from migration file (${skipped} skipped)`,
    entityType: "organization",
    entityId: organization.id,
    meta: { kind, inserted, skipped, errorCount: errors.length },
  });

  revalidateApp(
    "/admin",
    "/customers",
    "/appointments",
    "/inventory",
    "/invoices",
    "/dashboard",
    "/staff"
  );
  return { success: true, inserted, skipped, errors: errors.slice(0, 20) };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { redirect } = await import("next/navigation");
  redirect("/");
}
