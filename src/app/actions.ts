"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { isNiche } from "@/lib/niches";
import { getLhdnProvider } from "@/lib/lhdn";
import { canUseLhdn } from "@/lib/subscription";
import { revalidateApp, revalidateAppLayout } from "@/lib/revalidate";
import type {
  AppointmentStatus,
  InvoiceStatus,
  MembershipRole,
  PaymentMethod,
  SubscriptionPlan,
} from "@/lib/types";

async function requireMember() {
  const ctx = await getOrgContext();
  if (!ctx) throw new Error("No organization");
  const supabase = await createClient();
  return { ...ctx, supabase };
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

  revalidateApp("/dashboard"); revalidateAppLayout();
  return { success: true };
}

export async function upsertCustomerAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  const id = String(formData.get("id") || "");
  const payload = {
    organization_id: organization.id,
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "") || null,
    phone: String(formData.get("phone") || "") || null,
    notes: String(formData.get("notes") || "") || null,
  };
  if (!payload.name) return { error: "Name required" };

  const { error } = id
    ? await supabase.from("customers").update(payload).eq("id", id)
    : await supabase.from("customers").insert(payload);

  if (error) return { error: error.message };
  revalidateApp("/customers", "/dashboard", "/appointments", "/invoices", "/pos");
  return { success: true };
}

export async function deleteCustomerAction(id: string) {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateApp("/customers", "/dashboard", "/appointments", "/invoices");
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

  const { error } = id
    ? await supabase.from("products").update(payload).eq("id", id)
    : await supabase.from("products").insert(payload);

  if (error) return { error: error.message };
  revalidateApp("/inventory", "/pos", "/dashboard");
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

  revalidateApp("/inventory", "/pos", "/dashboard");
  return { success: true };
}

export async function createInvoiceAction(formData: FormData) {
  const { supabase, organization, profile } = await requireMember();
  const customerId = String(formData.get("customer_id") || "") || null;
  const taxAmount = Number(formData.get("tax_amount") || 0);
  const customNumber = String(formData.get("invoice_number") || "").trim();
  const title = String(formData.get("title") || "").trim() || null;

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

  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.unit_price,
    0
  );
  const total = subtotal + taxAmount;

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
    })
    .select("*")
    .single();

  if (error || !invoice) return { error: error?.message || "Invoice failed" };

  const { error: linesError } = await supabase.from("invoice_lines").insert(
    lines.map((line) => ({
      invoice_id: invoice.id,
      organization_id: organization.id,
      product_id: line.product_id || null,
      price_list_item_id: line.price_list_item_id || null,
      description: line.description,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_total: line.quantity * line.unit_price,
    }))
  );

  if (linesError) return { error: linesError.message };

  await supabase.from("invoice_status_logs").insert({
    organization_id: organization.id,
    invoice_id: invoice.id,
    from_status: null,
    to_status: "unpaid",
    changed_by: profile.id,
    note: "Invoice created",
  });

  revalidateApp("/invoices", "/dashboard", "/accounting", "/lhdn");
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

  revalidateApp("/invoices", "/dashboard", "/accounting");
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
    starts_at: String(formData.get("starts_at") || ""),
    ends_at: String(formData.get("ends_at") || ""),
    status: (String(formData.get("status") || "scheduled") as AppointmentStatus),
    notes: String(formData.get("notes") || "") || null,
    reminder_sent: formData.get("reminder_sent") === "on",
  };

  if (!payload.customer_id || !payload.title || !payload.starts_at || !payload.ends_at) {
    return { error: "Missing appointment fields" };
  }

  const { error } = await supabase.from("appointments").insert(payload);
  if (error) return { error: error.message };
  revalidateApp("/appointments", "/dashboard");
  return { success: true };
}

export async function updateAppointmentStatusAction(id: string, status: AppointmentStatus) {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidateApp("/appointments", "/dashboard");
  return { success: true };
}

export async function deleteAppointmentAction(id: string) {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateApp("/appointments", "/dashboard");
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

  revalidateApp("/pos", "/inventory", "/invoices", "/dashboard", "/accounting");
  return { success: true, invoiceId: invoice.id };
}

export async function createExpenseAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "") || null;
  const amount = Number(formData.get("amount") || 0);
  const expenseDate = String(formData.get("expense_date") || new Date().toISOString().slice(0, 10));

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

  revalidateApp("/accounting", "/dashboard");
  return { success: true };
}

export async function updateOrgSettingsAction(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (membership.role === "staff") return { error: "Forbidden" };

  const { error } = await supabase
    .from("organizations")
    .update({
      name: String(formData.get("name") || organization.name),
      phone: String(formData.get("phone") || "") || null,
      address: String(formData.get("address") || "") || null,
      tin: String(formData.get("tin") || "") || null,
      sst_number: String(formData.get("sst_number") || "") || null,
    })
    .eq("id", organization.id);

  if (error) return { error: error.message };
  revalidateApp("/settings", "/lhdn"); revalidateAppLayout();
  return { success: true };
}

export async function upgradePlanAction(plan: SubscriptionPlan) {
  const { supabase, organization, membership } = await requireMember();
  if (membership.role === "staff") return { error: "Forbidden" };

  const { error } = await supabase
    .from("organizations")
    .update({
      subscription_plan: plan,
      subscription_status: "active",
    })
    .eq("id", organization.id);

  if (error) return { error: error.message };
  revalidateApp("/settings", "/lhdn"); revalidateAppLayout();
  return { success: true };
}

export async function addStaffAction(formData: FormData) {
  const { supabase, organization, membership } = await requireMember();
  if (membership.role === "staff") return { error: "Forbidden" };

  const email = String(formData.get("email") || "").trim();
  const fullName = String(formData.get("full_name") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "staff") as MembershipRole;

  if (!email || !password || password.length < 6) {
    return { error: "Email and password (min 6) required" };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return {
      error:
        "Staff invite requires SUPABASE_SERVICE_ROLE_KEY. Ask owner to configure env.",
    };
  }

  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const admin = createAdminClient(url, serviceKey);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, locale: organization.locale_default },
  });

  if (createError || !created.user) {
    return { error: createError?.message || "Failed to create staff user" };
  }

  const { error } = await supabase.from("memberships").insert({
    organization_id: organization.id,
    user_id: created.user.id,
    role: role === "owner" ? "admin" : role,
  });

  if (error) return { error: error.message };
  revalidateApp("/staff");
  return { success: true };
}

export async function submitInvoiceToLhdnAction(invoiceId: string) {
  const { supabase, organization } = await requireMember();

  if (!canUseLhdn(organization.subscription_plan, organization.subscription_status)) {
    return { error: "Plan does not include LHDN e-Invoice" };
  }
  if (!organization.tin) return { error: "Set company TIN in settings first" };

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

  revalidateApp("/lhdn", "/invoices");
  return result.success
    ? { success: true, uuid: result.uuid }
    : { error: result.error || "LHDN submission failed" };
}

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
    .select("*")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === toStatus) return { success: true };

  const { error } = await supabase
    .from("invoices")
    .update({ status: toStatus })
    .eq("id", invoiceId);
  if (error) return { error: error.message };

  await supabase.from("invoice_status_logs").insert({
    organization_id: organization.id,
    invoice_id: invoiceId,
    from_status: invoice.status,
    to_status: toStatus,
    changed_by: profile.id,
    note: note || `Status changed from ${invoice.status} to ${toStatus}`,
  });

  revalidateApp("/invoices", "/dashboard", "/accounting");
  return { success: true };
}

export async function upsertServiceItemAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
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
  const { error } = await supabase.from("service_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateApp("/admin", "/invoices");
  return { success: true };
}

export async function upsertServiceCategoryAction(formData: FormData) {
  const { supabase, organization } = await requireMember();
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
  const { error } = await supabase.from("service_categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateApp("/admin", "/invoices");
  return { success: true };
}

export async function upsertPriceListItemAction(formData: FormData) {
  // Legacy no-op kept for compatibility — prices now live on service_items
  void formData;
  return { error: "Use Admin → Items/Services to set prices" };
}

export async function deletePriceListItemAction(id: string) {
  void id;
  return { error: "Use Admin → Items/Services to manage prices" };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidateApp("/dashboard", "/login");
}
