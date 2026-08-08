"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { isNiche, hasCapability, vocabLabels } from "@/lib/niches";
import { getLhdnProvider } from "@/lib/lhdn";
import { canUseLhdn } from "@/lib/subscription";
import { revalidateApp, revalidateAppLayout } from "@/lib/revalidate";
import { logActivity } from "@/lib/activity";
import {
  defaultAdminPassword,
  ADMIN_ZONE_SECTIONS,
  adminZoneCookieName,
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
  parseBoolFlag,
  parseDateTime,
  toNumber,
  type ImportKind,
  type ImportRow,
} from "@/lib/data-import";
import {
  assignableStaffRoles,
  canAccessSensitive,
  canManageOrgSettings,
  canManageStaff,
  kickableStaffRoles,
} from "@/lib/roles";
import { formatDayKeyMY, parseClinicDateTimeToIso } from "@/lib/datetime-my";
import { orgLogoStoragePath, resolveOrgLogoUrl } from "@/lib/org-logo";
import {
  formatInvoiceNumber,
  nextInvoiceSeq,
  normalizeInvoicePattern,
  normalizeInvoicePrefix,
  normalizeSeqDigits,
} from "@/lib/invoice-number";

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

const ADMIN_ZONE_COOKIE = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 8,
};

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

function normalizePersonName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeEmailValue(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeIcValue(value: string) {
  return value.replace(/[\s-]/g, "").toLowerCase();
}

export async function upsertCustomerAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const emailRaw = String(formData.get("email") || "").trim();
  const phoneRaw = String(formData.get("phone") || "").trim();
  const icRaw = String(formData.get("ic_number") || "").trim();
  const payload: Record<string, unknown> = {
    organization_id: organization.id,
    name,
    email: emailRaw || null,
    phone: phoneRaw || null,
    ic_number: icRaw || null,
    address: String(formData.get("address") || "").trim() || null,
    notes: String(formData.get("notes") || "") || null,
    allergies: String(formData.get("allergies") || "").trim() || null,
    risk_level:
      organization.niche === "tuition"
        ? null
        : ((["high", "medium", "low"].includes(String(formData.get("risk_level") || ""))
            ? String(formData.get("risk_level"))
            : null) as "high" | "medium" | "low" | null),
  };
  if (!payload.name) return { error: "Name required" };
  if (!payload.address) return { error: "Address required" };

  // Duplicate check: same org name / email / phone / IC (exclude self on edit).
  const { data: existingRows } = await supabase
    .from("customers")
    .select("id, name, email, phone, ic_number")
    .eq("organization_id", organization.id)
    .limit(3000);

  const nameKey = normalizePersonName(name);
  const emailKey = emailRaw ? normalizeEmailValue(emailRaw) : "";
  const phoneKey = phoneRaw ? normalizePhoneDigits(phoneRaw) : "";
  const icKey = icRaw ? normalizeIcValue(icRaw) : "";

  type Conflict = {
    name: string;
    email: string | null;
    phone: string | null;
    ic_number: string | null;
    matchedOn: string[];
  };
  const conflicts: Conflict[] = [];

  for (const row of existingRows || []) {
    if (id && row.id === id) continue;
    const matchedOn: string[] = [];
    if (nameKey && normalizePersonName(row.name || "") === nameKey) matchedOn.push("name");
    if (
      emailKey &&
      row.email &&
      normalizeEmailValue(row.email) === emailKey
    ) {
      matchedOn.push("email");
    }
    if (
      phoneKey.length >= 6 &&
      row.phone &&
      normalizePhoneDigits(row.phone) === phoneKey
    ) {
      matchedOn.push("phone");
    }
    if (icKey && row.ic_number && normalizeIcValue(row.ic_number) === icKey) {
      matchedOn.push("IC");
    }
    if (matchedOn.length) {
      conflicts.push({
        name: row.name || "—",
        email: row.email || null,
        phone: row.phone || null,
        ic_number: row.ic_number || null,
        matchedOn,
      });
    }
  }

  if (conflicts.length) {
    const { vocabLabels } = await import("@/lib/niches");
    const entity = vocabLabels(organization.niche, "en").entity;
    return {
      error: `A ${entity} with the same name, IC, email, or phone already exists.`,
      conflicts,
    };
  }

  if (!id) {
    payload.created_by = profile.id;
    payload.created_by_name = profile.full_name || profile.email || "Staff";
  }

  const { data, error } = id
    ? await supabase.from("customers").update(payload).eq("id", id).select("id").single()
    : await supabase.from("customers").insert(payload).select("id").single();

  if (error) return { error: error.message };

  const customerId = data?.id || id;

  // Tuition only: enrol subjects / classes (gym also has class_schedule — skip)
  if (organization.niche === "tuition" && customerId) {
    const classIds = formData
      .getAll("class_ids")
      .map((v) => String(v))
      .filter(Boolean);
    if (classIds.length) {
      await supabase.from("tuition_enrollments").upsert(
        classIds.map((class_id) => ({
          organization_id: organization.id,
          class_id,
          customer_id: customerId,
        })),
        { onConflict: "class_id,customer_id", ignoreDuplicates: true }
      );
    }

    const subjectIds = formData
      .getAll("subject_ids")
      .map((v) => String(v))
      .filter(Boolean);
    if (subjectIds.length) {
      await supabase.from("tuition_subject_enrollments").upsert(
        subjectIds.map((subject_id) => ({
          organization_id: organization.id,
          subject_id,
          customer_id: customerId,
        })),
        { onConflict: "subject_id,customer_id", ignoreDuplicates: true }
      );
    }
  }

  const { vocabLabels } = await import("@/lib/niches");
  const entity = vocabLabels(organization.niche, "en").entity;
  await logActivity({
    action: id ? "customer.update" : "customer.create",
    summary: id
      ? `Updated ${entity}: ${payload.name}`
      : `Registered ${entity}: ${payload.name}`,
    entityType: "customer",
    entityId: customerId || null,
  });

  revalidateApp(
    "/customers",
    "/dashboard",
    "/appointments",
    "/invoices",
    "/pos",
    "/staff",
    "/admin",
    "/classes"
  );
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

  const { vocabLabels } = await import("@/lib/niches");
  const entity = vocabLabels(organization.niche, "en").entity;
  await logActivity({
    action: "customer.delete",
    summary: `Deleted ${entity}: ${customer?.name || id}`,
    entityType: "customer",
    entityId: id,
  });

  revalidateApp("/customers", "/dashboard", "/appointments", "/invoices", "/staff", "/admin");
  return { success: true };
}

export async function getPatientTimelineAction(customerId: string) {
  const { supabase, organization } = await requireMember();
  if (!customerId) return { error: "Missing customer" };

  const { data: customer } = await supabase
    .from("customers")
    .select(
      "id, name, email, phone, ic_number, address, notes, risk_level, allergies, created_at"
    )
    .eq("id", customerId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!customer) return { error: "Customer not found" };

  const { hasCapability } = await import("@/lib/niches");
  const canAppointments = hasCapability(organization.niche, "appointments");

  const [{ data: appointments }, { data: invoices }] = await Promise.all([
    canAppointments
      ? supabase
          .from("appointments")
          .select("id, title, starts_at, ends_at, status, notes")
          .eq("organization_id", organization.id)
          .eq("customer_id", customerId)
          .order("starts_at", { ascending: false })
          .limit(80)
      : Promise.resolve({ data: [] as Array<{
          id: string;
          title: string | null;
          starts_at: string;
          ends_at: string | null;
          status: string;
          notes: string | null;
        }> }),
    supabase
      .from("invoices")
      .select(
        "id, invoice_number, title, status, total, amount_paid, created_at, issue_date"
      )
      .eq("organization_id", organization.id)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  return {
    data: {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        ic_number: customer.ic_number,
        address: customer.address,
        notes: customer.notes,
        risk_level: customer.risk_level as "high" | "medium" | "low" | null,
        allergies: hasCapability(organization.niche, "allergies") ? customer.allergies : null,
        created_at: customer.created_at,
      },
      appointments: (appointments || []).map((a) => ({
        id: a.id,
        title: a.title,
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        status: a.status as string,
        notes: a.notes as string | null,
      })),
      invoices: (invoices || []).map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number as string,
        title: inv.title as string | null,
        status: inv.status as string,
        total: Number(inv.total),
        amount_paid: Number(inv.amount_paid || 0),
        created_at: inv.created_at as string,
        issue_date: inv.issue_date as string | null,
      })),
    },
  };
}

export async function upsertProductAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  const id = String(formData.get("id") || "");
  const soldBy = String(formData.get("sold_by") || "each");
  const payload = {
    organization_id: organization.id,
    name: String(formData.get("name") || "").trim(),
    sku: String(formData.get("sku") || "") || null,
    barcode: String(formData.get("barcode") || "").trim() || null,
    description: String(formData.get("description") || "") || null,
    unit_price: Number(formData.get("unit_price") || 0),
    cost_price: Number(formData.get("cost_price") || 0),
    quantity: Number(formData.get("quantity") || 0),
    low_stock_threshold: Number(formData.get("low_stock_threshold") || 5),
    is_active: true,
    sold_by: ["each", "meter", "kg"].includes(soldBy) ? soldBy : "each",
    available_to_sale:
      !hasCapability(organization.niche, "pos") || formData.get("available_to_sale") === "on",
    track_stock: !hasCapability(organization.niche, "pos") || formData.get("track_stock") === "on",
    image_url: String(formData.get("image_url") || "").trim() || null,
    price_on_sale: formData.get("price_on_sale") === "on",
    category_id: String(formData.get("category_id") || "") || null,
  };
  if (!payload.name) return { error: "Name required" };

  const { data, error } = id
    ? await supabase.from("products").update(payload).eq("id", id).select("id").single()
    : await supabase.from("products").insert(payload).select("id").single();

  if (error) {
    if (/barcode|schema cache|could not find/i.test(error.message)) {
      // Retry without barcode if migration 018 not applied yet
      const { barcode: _b, ...withoutBarcode } = payload;
      const retry = id
        ? await supabase.from("products").update(withoutBarcode).eq("id", id).select("id").single()
        : await supabase.from("products").insert(withoutBarcode).select("id").single();
      if (retry.error) return { error: retry.error.message };
      await logActivity({
        action: id ? "inventory.update" : "inventory.add",
        summary: id
          ? `Updated inventory item: ${payload.name}`
          : `Added inventory item: ${payload.name} (qty ${payload.quantity})`,
        entityType: "product",
        entityId: retry.data?.id || id || null,
      });
      revalidateApp("/inventory", "/pos", "/dashboard", "/invoices");
      return { success: true };
    }
    return { error: error.message };
  }

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

  // Fire-and-forget: stock leaving without a sale is an AI supervisor signal.
  if (type !== "in") {
    void (async () => {
      try {
        const { runAfterStockAdjust } = await import("@/lib/alert-rules");
        await runAfterStockAdjust({
          supabase,
          orgId: organization.id,
          staffId: profile.id,
          staffName: profile.full_name || profile.email || "Staff",
          items: [
            {
              productId,
              name: String(product.name || "Item"),
              qty: quantity,
              unitPrice: Number(product.unit_price || 0),
            },
          ],
        });
      } catch {}
    })();
  }

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
    .select("id, name, quantity, unit_price")
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

  // Fire-and-forget: stock leaving without a sale is an AI supervisor signal.
  if (type !== "in") {
    void (async () => {
      try {
        const { runAfterStockAdjust } = await import("@/lib/alert-rules");
        await runAfterStockAdjust({
          supabase,
          orgId: organization.id,
          staffId: profile.id,
          staffName: profile.full_name || profile.email || "Staff",
          items: updates.map((u) => ({
            productId: u.id,
            name: u.name,
            qty: quantity,
            unitPrice: Number(byId.get(u.id)?.unit_price || 0),
          })),
        });
      } catch {}
    })();
  }

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
    formatInvoiceNumber(organization, nextInvoiceSeq(organization, count || 0));

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

  const titleNext =
    status === "paid" && typeof invoice.title === "string"
      ? invoice.title.replace(/\s*·\s*pending\s*$/i, " · paid")
      : invoice.title;

  await supabase
    .from("invoices")
    .update({
      amount_paid: amountPaid,
      status,
      ...(titleNext !== invoice.title ? { title: titleNext } : {}),
    })
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
      entry_date: formatDayKeyMY(),
      description: `Payment for ${invoice.invoice_number}`,
    });
  }

  await logActivity({
    action: "invoice.payment",
    summary: `Recorded payment RM ${amount.toFixed(2)} for ${invoice.invoice_number}`,
    entityType: "invoice",
    entityId: invoiceId,
  });

  // Fully paid → auto-submit to LHDN (errors returned as object, not thrown)
  if (status === "paid") {
    const lhdn = await submitInvoiceToLhdnAction(invoiceId);
    if (lhdn && "error" in lhdn && lhdn.error) {
      await logActivity({
        action: "invoice.lhdn_auto_failed",
        summary: `Auto LHDN after payment failed for ${invoice.invoice_number}: ${lhdn.error}`,
        entityType: "invoice",
        entityId: invoiceId,
      });
    }
  }

  revalidateApp("/invoices", "/dashboard", "/accounting", "/staff", "/lhdn");
  return { success: true, fullyPaid: status === "paid" };
}

/** Log reason when user leaves invoice preview without full payment. */
export async function logInvoiceEarlyExitAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  const invoiceId = String(formData.get("invoice_id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!invoiceId) return { error: "Missing invoice" };
  if (!reason) return { error: "Please enter a reason" };

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .eq("id", invoiceId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!invoice) return { error: "Invoice not found" };

  await logActivity({
    action: "invoice.exit_unpaid",
    summary: `Exited invoice ${invoice.invoice_number} without full payment — reason: ${reason}`,
    entityType: "invoice",
    entityId: invoiceId,
    meta: { reason },
  });

  revalidateApp("/invoices");
  return { success: true };
}

export async function createAppointmentAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  if (!hasCapability(organization.niche, "appointments")) {
    return { error: "Appointments are not available for this business type." };
  }
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

  const startsAt = parseClinicDateTimeToIso(String(formData.get("starts_at") || ""));
  const endsAt = parseClinicDateTimeToIso(String(formData.get("ends_at") || ""));

  const payload = {
    organization_id: organization.id,
    customer_id: String(formData.get("customer_id") || ""),
    title,
    starts_at: startsAt || "",
    ends_at: endsAt || "",
    status: String(formData.get("status") || "scheduled") as AppointmentStatus,
    notes: String(formData.get("notes") || "") || null,
    reminder_sent: formData.get("reminder_sent") === "on",
  };

  if (!payload.customer_id || !payload.title || !startsAt || !endsAt) {
    return { error: "Missing appointment fields" };
  }
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
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
  const todayMY = formatDayKeyMY();

  const marker = `appt:${appointmentId}`;

  // Load appointment + duplicate check in parallel
  const [{ data: appt, error: apptErr }, { data: existingByNote }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, title, customer_id, notes")
      .eq("id", appointmentId)
      .eq("organization_id", organization.id)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select("id")
      .eq("organization_id", organization.id)
      .ilike("notes", `%${marker}%`)
      .limit(1)
      .maybeSingle(),
  ]);

  if (apptErr || !appt) return { error: apptErr?.message || "Appointment not found" };

  // Mark completed immediately (don't wait for invoice pricing)
  const statusPromise = supabase
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", appointmentId);

  if (existingByNote?.id) {
    const { error: statusErr } = await statusPromise;
    if (statusErr) return { error: statusErr.message };
    void logActivity({
      action: "appointment.complete",
      summary: `Completed appointment (invoice already exists)`,
      entityType: "appointment",
      entityId: appointmentId,
    });
    revalidateApp("/appointments", "/invoices");
    return { success: true, invoiceId: existingByNote.id };
  }

  const { error: statusErr } = await statusPromise;
  if (statusErr) return { error: statusErr.message };

  // Fast-ish unique number: avoid full table count when possible
  const title = appt.title || "Consultation";
  const [{ count }, { data: cat }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organization.id),
    supabase
      .from("service_categories")
      .select("id")
      .eq("organization_id", organization.id)
      .ilike("name", title)
      .maybeSingle(),
  ]);
  const invoiceNumber = formatInvoiceNumber(
    organization,
    nextInvoiceSeq(organization, count || 0)
  );

  let price = 0;
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

  const finalPrice = price > 0 ? price : 0;
  const notes = `${marker}${appt.notes ? ` · ${appt.notes}` : ""}`;

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      organization_id: organization.id,
      customer_id: appt.customer_id,
      invoice_number: invoiceNumber,
      title: `${title} · pending`,
      status: "unpaid",
      issue_date: todayMY,
      subtotal: finalPrice,
      tax_amount: 0,
      total: finalPrice,
      amount_paid: 0,
      notes,
      medicine_description: null,
      medicine_amount: 0,
      additional_description: null,
      additional_amount: 0,
      lhdn_status: "not_submitted",
    })
    .select("id")
    .single();

  if (invErr || !invoice) return { error: invErr?.message || "Failed to create invoice" };

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
  if (lineErr && /line_kind/i.test(lineErr.message)) {
    delete linePayload.line_kind;
    const retry = await supabase.from("invoice_lines").insert(linePayload);
    lineErr = retry.error;
  }
  if (lineErr) {
    return {
      error: `Appointment completed, but invoice line failed: ${lineErr.message}`,
      invoiceId: invoice.id,
    };
  }

  const pct = Number(organization.service_charge_percent ?? 0);
  // Fire-and-forget non-critical work so UI can return faster
  void (async () => {
    try {
      if (pct > 0) {
        await syncInvoiceChargeAndTotals(supabase, organization.id, invoice.id, pct);
      }
    } catch {
      /* non-fatal */
    }
    await logActivity({
      action: "appointment.complete_invoice",
      summary: `Completed appointment → pending invoice ${invoiceNumber}`,
      entityType: "invoice",
      entityId: invoice.id,
    });
  })();

  revalidateApp("/appointments", "/invoices");
  return { success: true, invoiceId: invoice.id };
}

/** Add an optional medicine or additional cost line on a pending invoice. */
export async function addInvoiceCostAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();
  const invoiceId = String(formData.get("invoice_id") || "");
  const kindRaw = String(formData.get("cost_kind") || "medicine");
  const kind: InvoiceLineKind =
    kindRaw === "additional" ? "additional" : "medicine";

  if (!invoiceId) return { error: "Missing invoice" };

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status, invoice_number")
    .eq("id", invoiceId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === "paid" || invoice.status === "void") {
    return { error: "Cannot edit a paid/void invoice" };
  }

  if (kind === "medicine") {
    const productId = String(formData.get("product_id") || "").trim();
    const qtyRaw = formData.get("quantity") ?? formData.get("amount");
    const quantity =
      qtyRaw === null || String(qtyRaw).trim() === ""
        ? 1
        : Number(qtyRaw);
    if (!productId) return { error: "Select an inventory item" };
    if (!(quantity > 0) || !Number.isFinite(quantity)) {
      return { error: "Quantity must be greater than 0" };
    }

    const { data: product } = await supabase
      .from("products")
      .select("id, name, unit_price, quantity")
      .eq("id", productId)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!product) return { error: "Inventory item not found" };
    if (Number(product.quantity) < quantity) {
      return { error: `Insufficient stock (available: ${product.quantity})` };
    }

    const unitPrice = Number(product.unit_price || 0);
    const lineTotal = unitPrice * quantity;
    const { error } = await supabase.from("invoice_lines").insert({
      invoice_id: invoiceId,
      organization_id: organization.id,
      product_id: product.id,
      description: product.name,
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      line_kind: "medicine",
    });
    if (error) return { error: error.message };

    await supabase.from("stock_movements").insert({
      organization_id: organization.id,
      product_id: product.id,
      type: "sale",
      quantity,
      note: `Invoice ${invoice.invoice_number}`,
      created_by: profile.id,
    });
    await supabase
      .from("products")
      .update({ quantity: Number(product.quantity) - quantity })
      .eq("id", product.id);

    const pct = Number(organization.service_charge_percent ?? 0);
    await syncInvoiceChargeAndTotals(supabase, organization.id, invoiceId, pct);

    await logActivity({
      action: "invoice.add_cost",
      summary: `Added medicine: ${product.name} × ${quantity} (RM ${lineTotal.toFixed(2)})`,
      entityType: "invoice",
      entityId: invoiceId,
    });

    revalidateApp("/invoices", "/inventory");
    return { success: true };
  }

  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  if (!description) return { error: "Description required" };
  if (!(amount > 0)) return { error: "Amount must be greater than 0" };

  const { error } = await supabase.from("invoice_lines").insert({
    invoice_id: invoiceId,
    organization_id: organization.id,
    description: `Additional (${description})`,
    quantity: 1,
    unit_price: amount,
    line_total: amount,
    line_kind: "additional",
  });
  if (error) return { error: error.message };

  const pct = Number(organization.service_charge_percent ?? 0);
  await syncInvoiceChargeAndTotals(supabase, organization.id, invoiceId, pct);

  await logActivity({
    action: "invoice.add_cost",
    summary: `Added additional cost: ${description} (RM ${amount.toFixed(2)})`,
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidateApp("/invoices");
  return { success: true };
}

/** Remove a medicine/additional cost line (not product/service or service charge). */
export async function removeInvoiceLineAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();
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
    .select("id, line_kind, description, product_id, quantity")
    .eq("id", lineId)
    .eq("invoice_id", invoiceId)
    .maybeSingle();
  if (!line) return { error: "Line not found" };
  if (line.line_kind !== "medicine" && line.line_kind !== "additional") {
    return { error: "Only medicine/additional costs can be removed here" };
  }

  const { error } = await supabase.from("invoice_lines").delete().eq("id", lineId);
  if (error) return { error: error.message };

  // Restore inventory when removing a medicine line tied to a product
  if (line.line_kind === "medicine" && line.product_id) {
    const qty = Number(line.quantity || 0);
    if (qty > 0) {
      const { data: product } = await supabase
        .from("products")
        .select("id, quantity")
        .eq("id", line.product_id)
        .eq("organization_id", organization.id)
        .maybeSingle();
      if (product) {
        await supabase
          .from("products")
          .update({ quantity: Number(product.quantity) + qty })
          .eq("id", product.id);
        await supabase.from("stock_movements").insert({
          organization_id: organization.id,
          product_id: product.id,
          type: "adjust",
          quantity: qty,
          note: `Restored from removed invoice line`,
          created_by: profile.id,
        });
      }
    }
  }

  const pct = Number(organization.service_charge_percent ?? 0);
  await syncInvoiceChargeAndTotals(supabase, organization.id, invoiceId, pct);

  await logActivity({
    action: "invoice.remove_cost",
    summary: `Removed cost line: ${line.description}`,
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidateApp("/invoices", "/inventory");
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

  const startsAt = parseClinicDateTimeToIso(String(formData.get("starts_at") || ""));
  const endsAt = parseClinicDateTimeToIso(String(formData.get("ends_at") || ""));
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
      starts_at: startsAt,
      ends_at: endsAt,
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
  const { hasCapability } = await import("@/lib/niches");
  if (!hasCapability(organization.niche, "pos")) {
    return { error: "POS is not available for this business type." };
  }

  const customerId = String(formData.get("customer_id") || "") || null;
  const methodRaw = String(formData.get("payment_method") || "cash").toLowerCase();
  const paymentMethod =
    methodRaw === "card" ||
    methodRaw === "ewallet" ||
    methodRaw === "transfer" ||
    methodRaw === "other"
      ? methodRaw
      : "cash";

  type CartItem = { product_id: string; quantity: number; unit_price?: number };
  let items: CartItem[] = [];
  const cartJson = String(formData.get("cart_json") || "").trim();
  if (cartJson) {
    try {
      const parsed = JSON.parse(cartJson) as CartItem[];
      if (!Array.isArray(parsed) || !parsed.length) {
        return { error: "Cart is empty" };
      }
      items = parsed
        .map((row) => ({
          product_id: String(row.product_id || ""),
          quantity: Math.max(0, Number(row.quantity) || 0),
          unit_price: Number(row.unit_price),
        }))
        .filter((row) => row.product_id && row.quantity > 0);
    } catch {
      return { error: "Invalid cart data" };
    }
  } else {
    // Legacy single-product checkout
    const productId = String(formData.get("product_id") || "");
    const quantity = Math.max(1, Number(formData.get("quantity") || 1));
    if (productId) items = [{ product_id: productId, quantity }];
  }

  if (!items.length) return { error: "Cart is empty" };

  // Merge duplicate product lines
  const merged = new Map<string, { quantity: number; unit_price?: number }>();
  for (const row of items) {
    const previous = merged.get(row.product_id);
    merged.set(row.product_id, {
      quantity: (previous?.quantity || 0) + row.quantity,
      unit_price: Number.isFinite(row.unit_price) ? row.unit_price : previous?.unit_price,
    });
  }

  const productIds = [...merged.keys()];
  const { data: productRows } = await supabase
    .from("products")
    .select("*")
    .eq("organization_id", organization.id)
    .in("id", productIds);

  const productsById = new Map((productRows || []).map((p) => [p.id as string, p]));
  const lines: Array<{
    product: NonNullable<typeof productRows>[number];
    quantity: number;
    lineTotal: number;
  }> = [];

  for (const [pid, item] of merged) {
    const qty = item.quantity;
    const product = productsById.get(pid);
    if (!product) return { error: `Product not found` };
    if (!product.is_active || product.available_to_sale === false) {
      return { error: `${product.name} is not available for sale` };
    }
    if (product.track_stock !== false && Number(product.quantity) < qty) {
      return { error: `Insufficient stock for ${product.name}` };
    }
    const unitPrice =
      product.price_on_sale === true && Number.isFinite(item.unit_price) && Number(item.unit_price) >= 0
        ? Number(item.unit_price)
        : Number(product.unit_price);
    lines.push({
      product,
      quantity: qty,
      lineTotal: qty * unitPrice,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization.id);

  const invoiceNumber = formatInvoiceNumber(
    organization,
    nextInvoiceSeq(organization, count || 0)
  );

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: organization.id,
      customer_id: customerId,
      invoice_number: invoiceNumber,
      title: `POS ${invoiceNumber}`,
      status: "paid",
      subtotal,
      tax_amount: 0,
      total: subtotal,
      amount_paid: subtotal,
      created_by: profile.id,
      created_by_name: profile.full_name || profile.email || "Staff",
    })
    .select("*")
    .single();

  if (error || !invoice) return { error: error?.message || "Checkout failed" };

  await supabase.from("invoice_lines").insert(
    lines.map((l) => ({
      invoice_id: invoice.id,
      organization_id: organization.id,
      product_id: l.product.id,
      description: l.product.name,
      quantity: l.quantity,
      unit_price: l.quantity ? l.lineTotal / l.quantity : 0,
      line_total: l.lineTotal,
    }))
  );

  await supabase.from("payments").insert({
    organization_id: organization.id,
    invoice_id: invoice.id,
    amount: subtotal,
    method: paymentMethod,
  });

  for (const l of lines) {
    if (l.product.track_stock === false) continue;
    await supabase.from("stock_movements").insert({
      organization_id: organization.id,
      product_id: l.product.id,
      type: "sale",
      quantity: l.quantity,
      note: `POS ${invoiceNumber}`,
      created_by: profile.id,
    });
    await supabase
      .from("products")
      .update({ quantity: Number(l.product.quantity) - l.quantity })
      .eq("id", l.product.id);
  }

  if (paymentMethod === "cash") {
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
        type: "sale",
        amount: subtotal,
        note: `POS ${invoiceNumber}`,
        created_by: profile.id,
        created_by_name: profile.full_name || profile.email || "Staff",
      });
    }
  }

  const ticketId = String(formData.get("ticket_id") || "");
  if (ticketId) {
    await supabase
      .from("pos_tickets")
      .update({
        status: "completed",
        completed_invoice_id: invoice.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("organization_id", organization.id);
  }

  await supabase.from("ledger_entries").insert({
    organization_id: organization.id,
    entry_type: "income",
    source: "pos",
    source_id: invoice.id,
    amount: subtotal,
    entry_date: formatDayKeyMY(),
    description: `POS sale ${invoiceNumber}`,
  });

  const summaryItems = lines
    .map((l) => `${l.product.name} × ${l.quantity}`)
    .join(", ");

  await logActivity({
    action: "pos.checkout",
    summary: `POS sale ${invoiceNumber} · ${summaryItems}`,
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
  const expenseDate = String(formData.get("expense_date") || formatDayKeyMY());

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
  const entryDate = String(formData.get("entry_date") || formatDayKeyMY());

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
  if (!canManageOrgSettings(membership.role)) {
    return { error: "Forbidden — only the owner or a co-admin can update business settings." };
  }

  const patch: Record<string, unknown> = {
    name: String(formData.get("name") || organization.name),
    phone: String(formData.get("phone") || "") || null,
    address: String(formData.get("address") || "") || null,
    tin: String(formData.get("tin") || "") || null,
    sst_number: String(formData.get("sst_number") || "") || null,
  };

  if (formData.has("invoice_prefix")) {
    patch.invoice_prefix = normalizeInvoicePrefix(
      String(formData.get("invoice_prefix") || "INV")
    );
  }
  if (formData.has("invoice_next_seq")) {
    const seq = Math.max(1, Math.floor(Number(formData.get("invoice_next_seq")) || 1));
    patch.invoice_next_seq = seq;
  }
  if (formData.has("invoice_seq_digits")) {
    patch.invoice_seq_digits = normalizeSeqDigits(
      String(formData.get("invoice_seq_digits") || "5")
    );
  }
  if (formData.has("invoice_number_pattern")) {
    patch.invoice_number_pattern = normalizeInvoicePattern(
      String(formData.get("invoice_number_pattern") || "")
    );
  }

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
    if (/invoice_prefix|invoice_next_seq|invoice_seq_digits|invoice_number_pattern/i.test(error.message)) {
      return {
        error:
          "Database missing invoice format columns — run migrations 014_invoice_number_settings.sql and 015_invoice_number_pattern.sql in Supabase SQL Editor.",
      };
    }
    return { error: error.message };
  }
  if (!data) {
    return { error: "Could not save organization settings. Try again or contact support." };
  }
  revalidateApp("/settings", "/lhdn", "/admin", "/invoices");
  revalidateAppLayout();
  return { success: true };
}

export async function saveOrgLogoAction(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (!canManageOrgSettings(membership.role)) {
    return { error: "Forbidden — only the owner or a co-admin can update the logo." };
  }

  const shapeRaw = String(formData.get("logo_shape") || "round");
  const logo_shape = shapeRaw === "square" ? "square" : "round";

  // Primary path: data URL stored in organizations.logo_url (no Storage bucket required).
  const dataUrlRaw = String(formData.get("logo_data_url") || "").trim();
  const b64 = String(formData.get("logo_base64") || "").trim();

  let logo_url: string | null = organization.logo_url || null;
  let wroteImage = false;

  if (dataUrlRaw.startsWith("data:image/")) {
    if (dataUrlRaw.length > 1_200_000) {
      return { error: "Logo too large — try a simpler image" };
    }
    logo_url = dataUrlRaw;
    wroteImage = true;
  } else if (b64) {
    try {
      const bytes = Buffer.from(b64, "base64");
      if (bytes.byteLength > 900_000) {
        return { error: "Logo too large — try a simpler image" };
      }
      logo_url = `data:image/png;base64,${b64}`;
      wroteImage = true;
    } catch {
      return { error: "Invalid logo data" };
    }
  }

  if (!logo_url && !wroteImage) {
    return { error: "Choose a logo image first" };
  }

  const admin = await getServiceAdmin();
  const db = admin || supabase;

  const { data: saved, error } = await db
    .from("organizations")
    .update({ logo_url, logo_shape })
    .eq("id", organization.id)
    .select("id, logo_url, logo_shape")
    .maybeSingle();

  if (error) {
    if (/logo_url|logo_shape|schema cache|could not find/i.test(error.message)) {
      return {
        error:
          "Database missing logo columns — run migration 017_org_logo.sql STEP 1 only in Supabase SQL Editor, then Save again.",
      };
    }
    return { error: error.message };
  }

  if (!saved) {
    return { error: "Could not update organization logo (no row returned)." };
  }

  // Best-effort Storage mirror (optional — UI works from DB data URL alone).
  if (wroteImage && logo_url?.startsWith("data:image/") && admin) {
    try {
      const comma = logo_url.indexOf(",");
      const raw = comma >= 0 ? logo_url.slice(comma + 1) : "";
      const bytes = Buffer.from(raw, "base64");
      const path = orgLogoStoragePath(organization.id);
      await admin.storage.from("org-logos").remove([path]);
      await admin.storage
        .from("org-logos")
        .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
    } catch {
      // ignore storage mirror failures
    }
  }

  const finalUrl = saved.logo_url || logo_url;
  if (!finalUrl) {
    return {
      error:
        "Logo was not saved to the database. Confirm columns logo_url / logo_shape exist (migration 017 STEP 1).",
    };
  }

  const finalShape =
    saved.logo_shape === "square" ? "square" : logo_shape;

  await logActivity({
    action: "org.logo",
    summary: wroteImage
      ? `Updated ${vocabLabels(organization.niche, "en").business} logo (${finalShape})`
      : `Updated logo shape (${finalShape})`,
    entityType: "organization",
    entityId: organization.id,
  });

  revalidateAppLayout();
  revalidateApp("/admin", "/invoices", "/dashboard");
  return {
    success: true,
    data: { logo_url: finalUrl, logo_shape: finalShape as "round" | "square" },
  };
}

export async function removeOrgLogoAction() {
  const { supabase, organization, membership } = await requireMember();
  if (!canManageOrgSettings(membership.role)) {
    return { error: "Forbidden" };
  }

  const admin = await getServiceAdmin();
  const client = admin || supabase;
  try {
    await client.storage.from("org-logos").remove([orgLogoStoragePath(organization.id)]);
  } catch {
    // Storage optional — logo may live only in DB as data URL.
  }

  const { error } = await client
    .from("organizations")
    .update({ logo_url: null })
    .eq("id", organization.id);
  if (error) return { error: error.message };

  await logActivity({
    action: "org.logo_remove",
    summary: "Removed logo",
    entityType: "organization",
    entityId: organization.id,
  });

  revalidateAppLayout();
  revalidateApp("/admin", "/invoices", "/dashboard");
  return { success: true };
}

export async function upgradePlanAction(plan: SubscriptionPlan) {
  const { supabase, organization, membership } = await requireMember();
  if (!canManageOrgSettings(membership.role)) return { error: "Forbidden" };

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

  const email = String(formData.get("username") || formData.get("email") || "")
    .trim()
    .toLowerCase();
  const fullName = String(formData.get("full_name") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "staff") as MembershipRole;
  const jobTitle = String(formData.get("job_title") || "").trim() || null;

  const allowedRoles = assignableStaffRoles(membership.role);
  if (!allowedRoles.includes(role)) return { error: "Invalid role for your account" };
  if (!email) return { error: "Username (registered email) required" };

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
    // Prefer linking an already-registered Allvisor account (username = email).
    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = listed?.users?.find((u) => (u.email || "").toLowerCase() === email);
    if (found) {
      userId = found.id;
      await admin.from("profiles").upsert({
        id: found.id,
        email,
        full_name: fullName || found.user_metadata?.full_name || null,
      });
    } else if (password && password.length >= 6) {
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
        return { error: createError?.message || "Failed to create staff user" };
      }
      userId = created.user.id;
      await admin.from("profiles").upsert({
        id: created.user.id,
        email,
        full_name: fullName || null,
      });
    } else {
      return {
        error:
          "No Allvisor account found for this username. Set a password here to create the account, or ask them to register first.",
      };
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
    const { vocabLabels } = await import("@/lib/niches");
    const b = vocabLabels(organization.niche, "en").business;
    return { error: `This user is already a member of this ${b}` };
  }

  // One Allvisor account → one business dashboard only
  const { count: shopCount } = await admin
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((shopCount || 0) > 0) {
    const { vocabLabels } = await import("@/lib/niches");
    const b = vocabLabels(organization.niche, "en").business;
    return {
      error: `This account is already linked to another ${b} dashboard. One account can only join one ${b}.`,
    };
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
  if (!canManageStaff(membership.role)) return { error: "Not allowed to kick staff" };

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
  if (target.user_id === profile.id || target.user_id === membership.user_id) {
    return { error: "Cannot kick yourself" };
  }
  const allowed = kickableStaffRoles(membership.role);
  if (!allowed.includes(target.role as MembershipRole)) {
    return { error: "Not allowed to kick this role" };
  }

  const { error } = await supabase.from("memberships").delete().eq("id", membershipId);
  if (error) return { error: error.message };

  const targetProfile = Array.isArray(target.profiles)
    ? target.profiles[0]
    : target.profiles;
  await logActivity({
    action: "staff.kick",
    summary: `Removed staff ${targetProfile?.full_name || targetProfile?.email || target.user_id}`,
    entityType: "membership",
    entityId: target.user_id,
  });

  revalidateApp("/staff", "/admin");
  return { success: true };
}

async function upsertBidirectionalBranchLinks(
  admin: NonNullable<Awaited<ReturnType<typeof getServiceAdmin>>>,
  orgA: string,
  orgB: string
) {
  const { error } = await admin.from("branch_links").upsert(
    [
      { organization_id: orgA, linked_organization_id: orgB },
      { organization_id: orgB, linked_organization_id: orgA },
    ],
    { onConflict: "organization_id,linked_organization_id" }
  );
  return error;
}

export async function requestBranchLinkAction(formData: FormData) {
  const { supabase, organization, membership, profile } = await requireMember();
  if (!canManageStaff(membership.role)) return { error: "Only admin can link branches" };

  const branchName = String(formData.get("branch_name") || "").trim();
  if (!branchName) return { error: "Branch name required" };
  if (branchName.toLowerCase() === organization.name.toLowerCase()) {
    const b = vocabLabels(organization.niche, "en").business;
    return { error: `Cannot link to the same ${b}` };
  }

  const admin = await getServiceAdmin();
  if (!admin) {
    return { error: `Service role required to find other ${vocabLabels(organization.niche, "en").business}s` };
  }

  const { data: target } = await admin
    .from("organizations")
    .select("id, name")
    .ilike("name", branchName)
    .maybeSingle();

  if (!target) {
    const b = vocabLabels(organization.niche, "en").business;
    return { error: `No Allvisor ${b} found with name "${branchName}"` };
  }

  const { data: already } = await supabase
    .from("branch_links")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("linked_organization_id", target.id)
    .maybeSingle();
  if (already) return { error: "Already linked" };

  // Same person admin of both clinics → link immediately (show in branch list).
  const { data: targetMembership } = await admin
    .from("memberships")
    .select("role")
    .eq("organization_id", target.id)
    .eq("user_id", profile.id)
    .maybeSingle();

  const canAutoLink =
    !!targetMembership && canManageStaff(targetMembership.role as MembershipRole);

  if (canAutoLink) {
    const { error: reqError } = await admin.from("branch_link_requests").upsert(
      {
        from_organization_id: organization.id,
        to_organization_id: target.id,
        requested_by: profile.id,
        status: "approved",
      },
      { onConflict: "from_organization_id,to_organization_id" }
    );
    if (reqError) return { error: reqError.message };

    const linkError = await upsertBidirectionalBranchLinks(
      admin,
      organization.id,
      target.id
    );
    if (linkError) return { error: linkError.message };

    await logActivity({
      action: "branch.link",
      summary: `Linked branch "${target.name}"`,
      entityType: "organization",
      entityId: target.id,
    });

    revalidateApp("/admin");
    return { success: true };
  }

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
    const admin = await getServiceAdmin();
    if (!admin) return { error: "Service role required to complete branch link" };
    const linkError = await upsertBidirectionalBranchLinks(
      admin,
      req.from_organization_id,
      req.to_organization_id
    );
    if (linkError) return { error: linkError.message };
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
  if (!canAccessSensitive(membership.role)) {
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
  const targetOrgId = String(formData.get("target_org_id") || "");
  if (!targetOrgId) return { error: "Missing branch" };

  const email = String(formData.get("username") || formData.get("email") || "")
    .trim()
    .toLowerCase();
  const fullName = String(formData.get("full_name") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "staff") as MembershipRole;
  const jobTitle = String(formData.get("job_title") || "").trim() || null;
  if (!email) return { error: "Username (registered email) required" };
  const allowedRoles = assignableStaffRoles(membership.role);
  if (!allowedRoles.includes(role)) return { error: "Invalid role for your account" };

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
    if (fullName) {
      await admin.from("profiles").update({ full_name: fullName }).eq("id", userId);
    }
  } else {
    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = listed?.users?.find((u) => (u.email || "").toLowerCase() === email);
    if (found) {
      userId = found.id;
      await admin.from("profiles").upsert({
        id: found.id,
        email,
        full_name: fullName || found.user_metadata?.full_name || null,
      });
    } else if (password && password.length >= 6) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, account_type: "allvisor-staff" },
      });
      if (createError || !created.user) {
        return { error: createError?.message || "Failed to create staff user" };
      }
      userId = created.user.id;
      await admin.from("profiles").upsert({
        id: created.user.id,
        email,
        full_name: fullName || null,
      });
    } else {
      return {
        error:
          "No Allvisor account found for this username. Set a password here to create the account, or ask them to register first.",
      };
    }
  }

  if (!userId) return { error: "Could not resolve staff user" };

  const { data: alreadyHere } = await admin
    .from("memberships")
    .select("id")
    .eq("organization_id", targetOrgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (alreadyHere) {
    const b = vocabLabels(ctx.organization.niche, "en").business;
    return { error: `This user is already a member of this ${b}` };
  }

  const { count: shopCount } = await admin
    .from("memberships")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((shopCount || 0) > 0) {
    const b = vocabLabels(ctx.organization.niche, "en").business;
    return {
      error: `This account is already linked to another ${b} dashboard. One account can only join one ${b}.`,
    };
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
  if (!canManageStaff(membership.role)) return { error: "Not allowed to kick staff" };
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
  if (target.user_id === membership.user_id) return { error: "Cannot kick yourself" };
  if (!kickableStaffRoles(membership.role).includes(target.role as MembershipRole)) {
    return { error: "Not allowed to kick this role" };
  }

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

  const tinNorm = String(organization.tin).replace(/\s+/g, "").toUpperCase();
  const idValue = String(organization.lhdn_brn || "").replace(/\s+/g, "").trim();
  if (tinNorm.startsWith("IG") && (!idValue || idValue.toUpperCase() === "NA")) {
    return {
      error:
        "IG TIN requires your NRIC in LHDN settings (MyInvois ID Number, e.g. 011216100769). Save it then submit again.",
    };
  }

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
  const customer = invoice.customers as {
    name?: string | null;
    address?: string | null;
    phone?: string | null;
  } | null;

  // Skip zero-amount service_charge lines (MyInvois still validates them if sent).
  const billLines = (invoice.invoice_lines || []).filter(
    (line: { line_kind?: string | null; line_total?: number | string }) => {
      const kind = line.line_kind || "service";
      const amt = Number(line.line_total || 0);
      if (kind === "service_charge" && amt === 0) return false;
      return true;
    }
  );

  const result = await provider.submitInvoice({
    invoiceNumber: invoice.invoice_number,
    issueDate: invoice.issue_date,
    supplierTin: organization.tin,
    supplierBrn: organization.lhdn_brn || null,
    supplierSst: organization.sst_number || "NA",
    supplierName: organization.name,
    supplierAddress: organization.address || null,
    supplierPhone: organization.phone || null,
    // No buyer TIN yet → general public TIN (requires CLASS 004 in document builder)
    buyerName: customer?.name || "General Public",
    buyerTin: "EI00000000010",
    buyerAddress: customer?.address || null,
    buyerPhone: customer?.phone || organization.phone || null,
    itemClassification: "004",
    total: Number(invoice.total),
    taxAmount: Number(invoice.tax_amount),
    lines: billLines.map(
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

  const { data: submissionRow } = await supabase
    .from("lhdn_submissions")
    .insert({
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
    })
    .select("id")
    .maybeSingle();

  await supabase
    .from("invoices")
    .update({ lhdn_status: status })
    .eq("id", invoiceId);

  let finalStatus: import("@/lib/types").LhdnStatus = status;
  let finalMyinvois = "Submitted";
  let validationSummary: string | null = null;

  // Poll Get Document Details until Valid/Invalid (or timeout).
  if (result.success && result.uuid && process.env.LHDN_CLIENT_ID) {
    const { pollMyInvoisDocumentStatus } = await import("@/lib/lhdn/status");
    const details = await pollMyInvoisDocumentStatus({
      uuid: result.uuid,
      supplierTin: organization.tin,
      supplierBrn: organization.lhdn_brn || null,
      attempts: 5,
      delayMs: 2500,
    });

    if (details.success) {
      finalStatus = details.status;
      finalMyinvois = details.myinvoisStatus;
      validationSummary = details.validationSummary || null;

      const mergedResponse = {
        ...(result.response || {}),
        myinvoisStatus: details.myinvoisStatus,
        longId: details.longId,
        submissionUid: details.submissionUid,
        validationSummary: details.validationSummary,
        documentDetails: details.response,
      };

      if (submissionRow?.id) {
        await supabase
          .from("lhdn_submissions")
          .update({
            status: finalStatus,
            response: mergedResponse,
          })
          .eq("id", submissionRow.id);
      }

      await supabase
        .from("invoices")
        .update({ lhdn_status: finalStatus })
        .eq("id", invoiceId);
    }
  }

  await logActivity({
    action: "lhdn.submit",
    summary: `Submitted ${invoice.invoice_number} to LHDN (${finalMyinvois || finalStatus})`,
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidateApp("/lhdn", "/invoices", "/staff");
  return result.success
    ? {
        success: true,
        uuid: result.uuid,
        status: finalStatus,
        myinvoisStatus: finalMyinvois,
        validationSummary,
      }
    : {
        error:
          typeof result.error === "string"
            ? result.error
            : result.error
              ? JSON.stringify(result.error)
              : "LHDN submission failed",
      };
}

export async function refreshLhdnDocumentStatusAction(invoiceId: string) {
  const { supabase, organization } = await requireMember();

  if (!canUseLhdn(organization.subscription_plan, organization.subscription_status)) {
    return { error: "Plan does not include LHDN e-Invoice" };
  }
  if (!organization.tin) return { error: "Set company TIN in LHDN settings first" };
  if (!process.env.LHDN_CLIENT_ID || !process.env.LHDN_CLIENT_SECRET) {
    return { error: "LHDN credentials not configured" };
  }

  const { data: submission } = await supabase
    .from("lhdn_submissions")
    .select("id, uuid, response, status")
    .eq("organization_id", organization.id)
    .eq("invoice_id", invoiceId)
    .not("uuid", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!submission?.uuid) {
    return { error: "No LHDN UUID found for this invoice — submit first." };
  }

  const { fetchMyInvoisDocumentDetails } = await import("@/lib/lhdn/status");
  const details = await fetchMyInvoisDocumentDetails({
    uuid: submission.uuid,
    supplierTin: organization.tin,
    supplierBrn: organization.lhdn_brn || null,
  });

  if (!details.success) {
    return { error: details.error || "Could not refresh status from MyInvois" };
  }

  const mergedResponse = {
    ...((submission.response as Record<string, unknown>) || {}),
    myinvoisStatus: details.myinvoisStatus,
    longId: details.longId,
    submissionUid: details.submissionUid,
    validationSummary: details.validationSummary,
    documentDetails: details.response,
    refreshedAt: new Date().toISOString(),
  };

  await supabase
    .from("lhdn_submissions")
    .update({
      status: details.status,
      response: mergedResponse,
    })
    .eq("id", submission.id);

  await supabase
    .from("invoices")
    .update({ lhdn_status: details.status })
    .eq("id", invoiceId);

  await logActivity({
    action: "lhdn.refresh_status",
    summary: `Refreshed LHDN status → ${details.myinvoisStatus}`,
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidateApp("/lhdn", "/invoices", "/staff");
  return {
    success: true,
    status: details.status,
    myinvoisStatus: details.myinvoisStatus,
    validationSummary: details.validationSummary,
    uuid: details.uuid,
  };
}

export async function cancelInvoiceLhdnAction(invoiceId: string, reason?: string) {
  const { supabase, organization, membership } = await requireMember();
  if (!canAccessSensitive(membership.role)) return { error: "Forbidden" };

  if (!canUseLhdn(organization.subscription_plan, organization.subscription_status)) {
    return { error: "Plan does not include LHDN e-Invoice" };
  }
  if (!organization.tin) return { error: "Set company TIN in LHDN settings first" };
  if (!process.env.LHDN_CLIENT_ID || !process.env.LHDN_CLIENT_SECRET) {
    return { error: "LHDN credentials not configured" };
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, lhdn_status")
    .eq("id", invoiceId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!invoice) return { error: "Invoice not found" };

  const { data: submission } = await supabase
    .from("lhdn_submissions")
    .select("id, uuid, response, status")
    .eq("organization_id", organization.id)
    .eq("invoice_id", invoiceId)
    .not("uuid", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!submission?.uuid) {
    return { error: "No LHDN UUID to cancel — submit first." };
  }
  if (invoice.lhdn_status === "cancelled" || submission.status === "cancelled") {
    return { error: "This e-Invoice is already cancelled." };
  }

  const cancelReason =
    (reason || "").trim().slice(0, 300) || "Cancelled from Allvisor invoice list";

  const { cancelMyInvoisDocument } = await import("@/lib/lhdn/cancel");
  const result = await cancelMyInvoisDocument({
    uuid: submission.uuid,
    reason: cancelReason,
    supplierTin: organization.tin,
    supplierBrn: organization.lhdn_brn || null,
  });

  if (!result.success) {
    return { error: result.error || "Cancel failed" };
  }

  const mergedResponse = {
    ...((submission.response as Record<string, unknown>) || {}),
    myinvoisStatus: "Cancelled",
    cancelledAt: new Date().toISOString(),
    cancelReason,
    cancelResponse: result.response,
  };

  await supabase
    .from("lhdn_submissions")
    .update({
      status: "cancelled",
      response: mergedResponse,
    })
    .eq("id", submission.id);

  await supabase
    .from("invoices")
    .update({ lhdn_status: "cancelled" })
    .eq("id", invoiceId);

  await logActivity({
    action: "lhdn.cancel",
    summary: `Cancelled LHDN e-Invoice for ${invoice.invoice_number}`,
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidateApp("/lhdn", "/invoices", "/staff");
  return {
    success: true,
    uuid: result.uuid,
    myinvoisStatus: "Cancelled",
  };
}

export async function getInvoicePreviewAction(invoiceId: string) {
  const { supabase, organization } = await requireMember();
  const [
    { data: invoice },
    { data: lines },
    { data: payments },
    { data: latestLhdn },
    { data: products },
  ] = await Promise.all([
      supabase
        .from("invoices")
        .select("*, customers(name, phone, email, address, risk_level, allergies)")
        .eq("id", invoiceId)
        .eq("organization_id", organization.id)
        .maybeSingle(),
      supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("id"),
      supabase
        .from("payments")
        .select("id, amount, method, paid_at")
        .eq("invoice_id", invoiceId)
        .order("paid_at", { ascending: false }),
      supabase
        .from("lhdn_submissions")
        .select("uuid, status, response")
        .eq("invoice_id", invoiceId)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("products")
        .select("id, name, unit_price, quantity")
        .eq("organization_id", organization.id)
        .order("name"),
    ]);

  if (!invoice) return { error: "Invoice not found" };

  // Fresh logo fetch (avoid stale org embed / schema-cache misses)
  const [{ data: orgLogoRow }, adminClient] = await Promise.all([
    supabase
      .from("organizations")
      .select("logo_url, logo_shape, name, address, phone")
      .eq("id", organization.id)
      .maybeSingle(),
    getServiceAdmin(),
  ]);
  const resolvedLogo = await resolveOrgLogoUrl(
    adminClient || supabase,
    organization.id,
    orgLogoRow?.logo_url || organization.logo_url || null
  );

  const customerRaw = Array.isArray(invoice.customers)
    ? invoice.customers[0]
    : invoice.customers;
  const customer = (customerRaw || null) as {
    name?: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    risk_level?: "high" | "medium" | "low" | null;
    allergies?: string | null;
  } | null;

  return {
    data: {
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        title: invoice.title,
        status: invoice.status,
        total: Number(invoice.total),
        amount_paid: Number(invoice.amount_paid),
        created_at: invoice.created_at,
        issue_date: invoice.issue_date,
        lhdn_status: invoice.lhdn_status,
        tax_amount: Number(invoice.tax_amount || 0),
        subtotal: Number(invoice.subtotal || 0),
        customers: invoice.customers,
      },
      lines: (lines || []).map((l) => ({
        id: l.id,
        description: l.description,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        line_total: Number(l.line_total),
        line_kind: (l.line_kind || "service") as
          | "service"
          | "medicine"
          | "additional"
          | "service_charge",
      })),
      payments: payments || [],
      latestLhdn: latestLhdn
        ? {
            uuid: latestLhdn.uuid,
            status: latestLhdn.status,
            myinvoisStatus: (
              (latestLhdn.response || {}) as { myinvoisStatus?: string }
            ).myinvoisStatus,
          }
        : null,
      orgName: orgLogoRow?.name || organization.name,
      orgAddress: orgLogoRow?.address ?? organization.address,
      orgPhone: orgLogoRow?.phone ?? organization.phone,
      orgLogoUrl: resolvedLogo,
      orgLogoShape: ((orgLogoRow?.logo_shape || organization.logo_shape) === "square"
        ? "square"
        : "round") as "round" | "square",
      serviceChargePercent: Number(organization.service_charge_percent ?? 0),
      customer,
      products: (products || []).map((p) => ({
        id: p.id,
        name: p.name,
        unit_price: Number(p.unit_price || 0),
        quantity: Number(p.quantity || 0),
      })),
    },
  };
}

/** In-place revoke: mark invoice void so list shows grey + strikethrough. */
export async function revokeInvoiceAction(invoiceId: string) {
  const { supabase, organization, membership } = await requireMember();
  if (!canAccessSensitive(membership.role)) return { error: "Forbidden" };
  if (!invoiceId) return { error: "Missing invoice" };

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_number, status")
    .eq("id", invoiceId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === "void") return { success: true };

  const { error } = await supabase
    .from("invoices")
    .update({ status: "void" })
    .eq("id", invoiceId);
  if (error) return { error: error.message };

  await logActivity({
    action: "invoice.revoke",
    summary: `Revoked invoice ${invoice.invoice_number}`,
    entityType: "invoice",
    entityId: invoiceId,
  });

  revalidateApp("/invoices", "/dashboard", "/lhdn", "/staff");
  return { success: true };
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
        entry_date: formatDayKeyMY(),
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
  const orgId = ctx.organization.id;
  // One unlock opens the whole admin zone (admin + accounting + LHDN).
  if (jar.get(adminZoneCookieName(orgId))?.value === "1") return true;
  if (jar.get(sectionCookieName(orgId, section))?.value === "1") return true;
  // backward compat for admin cookie name
  if (section === "admin" && jar.get(legacyAdminCookieName(orgId))?.value === "1") {
    return true;
  }
  // Any individual section cookie also counts as zone unlock (legacy per-page unlocks).
  for (const s of ADMIN_ZONE_SECTIONS) {
    if (jar.get(sectionCookieName(orgId, s))?.value === "1") return true;
  }
  if (jar.get(legacyAdminCookieName(orgId))?.value === "1") return true;
  return false;
}

export async function isAdminUnlocked() {
  return isSectionUnlocked("admin");
}

export async function isAdminZoneUnlocked() {
  return isSectionUnlocked("admin");
}

export async function unlockSectionAction(formData: FormData) {
  const { organization } = await requireMember();
  // Any role may unlock: knowing the zone password IS the authorisation. That
  // is what lets a supervisor step in from a plain staff account mid-shift.

  const section = String(formData.get("section") || "admin") as LockedSection;
  if (!ADMIN_ZONE_SECTIONS.includes(section)) {
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
  // Unlock entire admin zone once — free move between Admin / Accounting / LHDN.
  jar.set(adminZoneCookieName(organization.id), "1", ADMIN_ZONE_COOKIE);
  for (const s of ADMIN_ZONE_SECTIONS) {
    jar.set(sectionCookieName(organization.id, s), "1", ADMIN_ZONE_COOKIE);
  }
  jar.set(legacyAdminCookieName(organization.id), "1", ADMIN_ZONE_COOKIE);

  revalidateApp("/admin", "/accounting", "/lhdn");
  revalidateAppLayout();
  return { success: true };
}

export async function unlockAdminAction(formData: FormData) {
  formData.set("section", "admin");
  return unlockSectionAction(formData);
}

async function clearAdminZoneCookies(orgId: string) {
  const jar = await cookies();
  const clear = {
    ...ADMIN_ZONE_COOKIE,
    maxAge: 0,
  };
  jar.set(adminZoneCookieName(orgId), "", clear);
  for (const s of ADMIN_ZONE_SECTIONS) {
    jar.set(sectionCookieName(orgId, s), "", clear);
  }
  jar.set(legacyAdminCookieName(orgId), "", clear);
}

/** Lock Admin / Accounting / LHDN again so staff cannot open them. */
export async function lockAdminZoneAction() {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not authenticated" };
  await clearAdminZoneCookies(ctx.organization.id);
  revalidateApp("/admin", "/accounting", "/lhdn", "/dashboard");
  revalidateAppLayout();
  return { success: true };
}

export async function changeAdminPasswordAction(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (!canManageOrgSettings(membership.role)) return { error: "Forbidden" };
  const unlocked = await isSectionUnlocked("admin");
  if (!unlocked) return { error: "Admin unlock required" };

  const next = String(formData.get("new_password") || "").trim();
  const confirm = String(formData.get("confirm_password") || "").trim();
  if (next.length < 6) return { error: "Password min 6 characters" };
  if (next !== confirm) return { error: "Passwords do not match" };

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

/** Resolve own org or linked branch for admin settings writes. */
async function resolveBranchOrgWriteTarget(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (!canAccessSensitive(membership.role)) {
    return { error: "Forbidden" as const };
  }
  const unlocked = await isSectionUnlocked("admin");
  if (!unlocked) return { error: "Admin unlock required" as const };

  const targetOrgId = String(formData.get("target_org_id") || organization.id);
  if (targetOrgId === organization.id) {
    return { db: supabase, targetOrgId, organization };
  }

  const { data: link } = await supabase
    .from("branch_links")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("linked_organization_id", targetOrgId)
    .maybeSingle();
  if (!link) return { error: "Branch not linked" as const };

  const admin = await getServiceAdmin();
  if (!admin) return { error: "Server admin client unavailable" as const };
  return { db: admin, targetOrgId, organization };
}

export async function updateClinicHoursAction(formData: FormData) {
  const target = await resolveBranchOrgWriteTarget(formData);
  if ("error" in target) return { error: target.error };

  const { db, targetOrgId } = target;
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

  const { error } = await db
    .from("organizations")
    .update({
      clinic_open_hour: openHour,
      clinic_close_hour: closeHour,
      closed_weekdays: closedWeekdays,
    })
    .eq("id", targetOrgId);

  if (error) return { error: error.message };

  await logActivity({
    action: "admin.clinic_hours",
    summary: `Updated hours ${String(openHour).padStart(2, "0")}:00–${String(closeHour).padStart(2, "0")}:00`,
    entityType: "organization",
    entityId: targetOrgId,
  });

  revalidateApp("/admin", "/dashboard", "/appointments");
  revalidateAppLayout();
  return { success: true };
}

export async function updateServiceChargeAction(formData: FormData) {
  const target = await resolveBranchOrgWriteTarget(formData);
  if ("error" in target) return { error: target.error };

  const { db, targetOrgId } = target;
  const pct = Number(formData.get("service_charge_percent") || 0);
  if (Number.isNaN(pct) || pct < 0 || pct > 100) {
    return { error: "Service charge must be between 0 and 100%" };
  }

  const { error } = await db
    .from("organizations")
    .update({ service_charge_percent: pct })
    .eq("id", targetOrgId);
  if (error) return { error: error.message };

  await logActivity({
    action: "admin.service_charge",
    summary: `Set service charge to ${pct}%`,
    entityType: "organization",
    entityId: targetOrgId,
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
  if (!canAccessSensitive(membership.role)) {
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
      const forceNoRisk = organization.niche === "tuition";
      payloads.push({
        organization_id: organization.id,
        name,
        ic_number: String(r.ic_number || "").trim() || null,
        phone: String(r.phone || "").trim() || null,
        email: String(r.email || "").trim() || null,
        address: String(r.address || "").trim() || null,
        notes: String(r.notes || "").trim() || null,
        risk_level: forceNoRisk
          ? null
          : ((["high", "medium", "low"].includes(risk)
              ? risk
              : null) as "high" | "medium" | "low" | null),
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
    const { data: cats } = await supabase
      .from("product_categories")
      .select("id, name")
      .eq("organization_id", organization.id);
    const catByName = new Map(
      (cats || []).map((c) => [c.name.trim().toLowerCase(), c.id] as const)
    );
    const payloads = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = String(r.name || "").trim();
      if (!name) {
        skipped++;
        errors.push({ row: i + 2, message: "Name required" });
        continue;
      }
      const soldRaw = String(r.sold_by || "each").trim().toLowerCase();
      const sold_by = ["each", "meter", "kg"].includes(soldRaw) ? soldRaw : "each";
      const catName = String(r.category || "").trim();
      const category_id = catName ? catByName.get(catName.toLowerCase()) || null : null;
      if (catName && !category_id) {
        errors.push({
          row: i + 2,
          message: `Category not found (imported without category): ${catName}`,
        });
      }
      payloads.push({
        organization_id: organization.id,
        name,
        sku: String(r.sku || "").trim() || null,
        barcode: String(r.barcode || "").trim() || null,
        category_id,
        sold_by,
        description: String(r.description || "").trim() || null,
        unit_price: toNumber(r.unit_price),
        cost_price: toNumber(r.cost_price),
        quantity: toNumber(r.quantity),
        low_stock_threshold: Math.round(toNumber(r.low_stock_threshold, 5)),
        available_to_sale: parseBoolFlag(r.available_to_sale, true),
        track_stock: parseBoolFlag(r.track_stock, true),
        price_on_sale: parseBoolFlag(r.price_on_sale, false),
        is_active: true,
      });
    }
    for (let i = 0; i < payloads.length; i += 100) {
      const chunk = payloads.slice(i, i + 100);
      let { error } = await supabase.from("products").insert(chunk);
      if (error && /barcode|sold_by|category_id|schema cache|could not find/i.test(error.message)) {
        const stripped = chunk.map(
          ({
            barcode: _b,
            sold_by: _s,
            category_id: _c,
            available_to_sale: _a,
            track_stock: _t,
            price_on_sale: _p,
            ...rest
          }) => rest
        );
        ({ error } = await supabase.from("products").insert(stripped));
      }
      if (error) return { error: error.message, inserted, skipped, errors };
      inserted += chunk.length;
    }
  } else if (kind === "product_categories") {
    const parentsFirst = [...rows].sort((a, b) => {
      const ap = String(a.parent || "").trim();
      const bp = String(b.parent || "").trim();
      if (!ap && bp) return -1;
      if (ap && !bp) return 1;
      return 0;
    });
    const idByName = new Map<string, string>();
    const { data: existing } = await supabase
      .from("product_categories")
      .select("id, name")
      .eq("organization_id", organization.id);
    for (const c of existing || []) {
      idByName.set(c.name.trim().toLowerCase(), c.id);
    }
    for (let i = 0; i < parentsFirst.length; i++) {
      const r = parentsFirst[i];
      const name = String(r.name || "").trim();
      if (!name) {
        skipped++;
        errors.push({ row: i + 2, message: "Category name required" });
        continue;
      }
      const key = name.toLowerCase();
      if (idByName.has(key)) {
        skipped++;
        continue;
      }
      const parentName = String(r.parent || "").trim();
      const parent_id = parentName ? idByName.get(parentName.toLowerCase()) || null : null;
      if (parentName && !parent_id) {
        skipped++;
        errors.push({ row: i + 2, message: `Parent category not found: ${parentName}` });
        continue;
      }
      const { data, error } = await supabase
        .from("product_categories")
        .insert({ organization_id: organization.id, name, parent_id })
        .select("id")
        .single();
      if (error) return { error: error.message, inserted, skipped, errors };
      idByName.set(key, data.id);
      inserted++;
    }
  } else if (kind === "suppliers") {
    const payloads = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = String(r.name || "").trim();
      if (!name) {
        skipped++;
        errors.push({ row: i + 2, message: "Supplier name required" });
        continue;
      }
      payloads.push({
        organization_id: organization.id,
        name,
        phone: String(r.phone || "").trim() || null,
        email: String(r.email || "").trim() || null,
        address: String(r.address || "").trim() || null,
        notes: String(r.notes || "").trim() || null,
      });
    }
    for (let i = 0; i < payloads.length; i += 100) {
      const chunk = payloads.slice(i, i + 100);
      const { error } = await supabase.from("suppliers").insert(chunk);
      if (error) return { error: error.message, inserted, skipped, errors };
      inserted += chunk.length;
    }
  } else if (kind === "past_sales") {
    // Historical receipts/invoices for customer History. Does NOT adjust stock.
    const [{ data: customers }, { data: products }] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name, ic_number, phone")
        .eq("organization_id", organization.id),
      supabase
        .from("products")
        .select("id, name, sku, barcode")
        .eq("organization_id", organization.id),
    ]);

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
    const byBarcode = new Map(
      (products || [])
        .filter((p) => p.barcode)
        .map((p) => [String(p.barcode).trim().toLowerCase(), p] as const)
    );
    const bySku = new Map(
      (products || [])
        .filter((p) => p.sku)
        .map((p) => [String(p.sku).trim().toLowerCase(), p] as const)
    );
    const byProductName = new Map(
      (products || []).map((p) => [p.name.trim().toLowerCase(), p] as const)
    );

    type SaleLine = {
      product_id: string | null;
      description: string;
      quantity: number;
      unit_price: number;
      line_total: number;
      row: number;
    };
    type SaleGroup = {
      invoice_number: string;
      issue_date: string;
      created_at: string;
      customer_id: string;
      payment_method: string;
      notes: string | null;
      lines: SaleLine[];
    };

    const groups = new Map<string, SaleGroup>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const invoiceNumber = String(r.invoice_number || "").trim();
      const productName = String(r.product_name || "").trim();
      const qty = toNumber(r.quantity, 1);
      const unitPrice = toNumber(r.unit_price);
      if (!invoiceNumber) {
        skipped++;
        errors.push({ row: i + 2, message: "invoice_number required" });
        continue;
      }
      if (!productName || qty <= 0) {
        skipped++;
        errors.push({ row: i + 2, message: "product_name and quantity required" });
        continue;
      }

      const customerName = String(r.customer_name || "").trim();
      const customerIc = String(r.customer_ic || "").trim().toLowerCase();
      const customerPhone = String(r.customer_phone || "").replace(/\D/g, "");
      const customerId =
        (customerIc && byIc.get(customerIc)) ||
        (customerPhone && byPhone.get(customerPhone)) ||
        (customerName && byName.get(customerName.toLowerCase())) ||
        null;
      if (!customerId) {
        skipped++;
        errors.push({
          row: i + 2,
          message: `Customer not found (${customerName || customerIc || customerPhone || "—"})`,
        });
        continue;
      }

      const barcode = String(r.barcode || "").trim().toLowerCase();
      const sku = String(r.sku || "").trim().toLowerCase();
      const product =
        (barcode && byBarcode.get(barcode)) ||
        (sku && bySku.get(sku)) ||
        byProductName.get(productName.toLowerCase()) ||
        null;

      const issueRaw = String(r.issue_date || "").trim();
      const parsed = parseDateTime(issueRaw) || parseDateTime(`${issueRaw} 12:00`);
      const createdAt = parsed || new Date().toISOString();
      const issueDate = createdAt.slice(0, 10);

      const methodRaw = String(r.payment_method || "cash").toLowerCase();
      const paymentMethod =
        methodRaw === "card" ||
        methodRaw === "ewallet" ||
        methodRaw === "transfer" ||
        methodRaw === "other"
          ? methodRaw
          : "cash";

      const key = invoiceNumber.toLowerCase();
      let group = groups.get(key);
      if (!group) {
        group = {
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          created_at: createdAt,
          customer_id: customerId,
          payment_method: paymentMethod,
          notes: String(r.notes || "").trim() || "Imported past sale",
          lines: [],
        };
        groups.set(key, group);
      } else if (group.customer_id !== customerId) {
        skipped++;
        errors.push({
          row: i + 2,
          message: `Invoice ${invoiceNumber} has mixed customers`,
        });
        continue;
      }

      group.lines.push({
        product_id: product?.id || null,
        description: product?.name || productName,
        quantity: qty,
        unit_price: unitPrice,
        line_total: qty * unitPrice,
        row: i + 2,
      });
    }

    for (const group of groups.values()) {
      if (!group.lines.length) continue;
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("invoice_number", group.invoice_number)
        .maybeSingle();
      if (existing) {
        skipped += group.lines.length;
        errors.push({
          row: group.lines[0].row,
          message: `Invoice already exists: ${group.invoice_number}`,
        });
        continue;
      }

      const subtotal = group.lines.reduce((s, l) => s + l.line_total, 0);
      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
          organization_id: organization.id,
          customer_id: group.customer_id,
          invoice_number: group.invoice_number,
          title: `Past sale ${group.invoice_number}`,
          status: "paid",
          issue_date: group.issue_date,
          subtotal,
          tax_amount: 0,
          total: subtotal,
          amount_paid: subtotal,
          notes: group.notes,
          created_by: profile.id,
          created_by_name: actor,
          created_at: group.created_at,
        })
        .select("id")
        .single();
      if (error || !invoice) {
        return {
          error: error?.message || `Failed to create ${group.invoice_number}`,
          inserted,
          skipped,
          errors,
        };
      }

      const { error: lineErr } = await supabase.from("invoice_lines").insert(
        group.lines.map((l) => ({
          invoice_id: invoice.id,
          organization_id: organization.id,
          product_id: l.product_id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          line_total: l.line_total,
        }))
      );
      if (lineErr) return { error: lineErr.message, inserted, skipped, errors };

      await supabase.from("payments").insert({
        organization_id: organization.id,
        invoice_id: invoice.id,
        amount: subtotal,
        method: group.payment_method,
        note: group.notes,
      });

      inserted += group.lines.length;
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
      const customerId =
        (patientIc && byIc.get(patientIc)) ||
        (patientPhone && byPhone.get(patientPhone)) ||
        (patientName && byName.get(patientName.toLowerCase())) ||
        null;

      if (!customerId) {
        skipped++;
        errors.push({
          row: i + 2,
          message: `${vocabLabels(organization.niche, "en").entity.replace(/\b\w/g, (c) => c.toUpperCase())} not found (${patientName || patientIc || patientPhone || "—"})`,
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

  const kindLabel =
    kind === "patients"
      ? vocabLabels(organization.niche, "en").entityPlural
      : kind === "appointments"
        ? vocabLabels(organization.niche, "en").schedule.toLowerCase()
        : kind;
  await logActivity({
    action: "admin.data_import",
    summary: `Imported ${inserted} ${kindLabel} row(s) from migration file (${skipped} skipped)`,
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
    "/receipts",
    "/pos",
    "/dashboard",
    "/staff"
  );
  return { success: true, inserted, skipped, errors: errors.slice(0, 20) };
}

/**
 * Staff confirm their account with a code before any dashboard opens. RLS keeps
 * members from editing their own row, so the write goes through the service role.
 */
export async function verifyMembershipAction(formData: FormData) {
  const { supabase, membership } = await requireMember();
  const { expectedVerificationCode, getVerificationState, roleNeedsVerification } =
    await import("@/lib/membership-verification");

  if (!roleNeedsVerification(membership.role)) return { success: true };

  const state = await getVerificationState({
    supabase,
    membershipId: membership.id,
    role: membership.role,
  });
  if (!state.required) return { success: true };

  const code = String(formData.get("code") || "").trim();
  if (!code) return { error: "codeRequired" };
  if (code !== expectedVerificationCode(state.storedCode)) return { error: "codeWrong" };

  const admin = await getServiceAdmin();
  const client = admin || supabase;
  const { error } = await client
    .from("memberships")
    .update({ verified_at: new Date().toISOString(), verification_code: null })
    .eq("id", membership.id);
  if (error) return { error: error.message };

  await logActivity({
    action: "staff.verified",
    summary: "Confirmed their account with the emailed code",
    entityType: "membership",
    entityId: membership.id,
  });

  revalidateAppLayout();
  return { success: true };
}

/** Owner-triggered rescore, used when the nightly cron has not run yet. */
export async function recalculateStaffScoresAction() {
  const { supabase, organization, membership } = await requireMember();
  if (!canManageOrgSettings(membership.role)) return { error: "Forbidden" };

  const { computeStaffScores, saveStaffScores } = await import("@/lib/staff-scores");
  const today = formatDayKeyMY();
  const yesterday = formatDayKeyMY(new Date(Date.now() - 86400000));

  let saved = 0;
  for (const day of [yesterday, today]) {
    const rows = await computeStaffScores({ supabase, orgId: organization.id, day });
    const result = await saveStaffScores(supabase, rows);
    if (result.error) return { error: result.error };
    saved += result.saved;
  }

  revalidateApp("/team", "/performance", "/admin-dashboard");
  return { success: true, saved };
}

export async function signOutAction() {
  // Signing out always leaves the manager zone, so the next person on this
  // device starts locked out of Admin / Accounting / LHDN.
  const ctx = await getOrgContext();
  if (ctx) await clearAdminZoneCookies(ctx.organization.id);

  const supabase = await createClient();
  await supabase.auth.signOut();
  const { redirect } = await import("next/navigation");
  redirect("/");
}
