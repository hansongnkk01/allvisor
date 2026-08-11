"use server";

import { revalidateApp } from "@/lib/revalidate";
import { logActivity } from "@/lib/activity";
import { requireMemberWithCapability } from "@/lib/require-capability";
import type { Capability } from "@/lib/niche-capabilities";
import { formatInvoiceNumber, nextInvoiceSeq } from "@/lib/invoice-number";
import type { InvoiceStatus } from "@/lib/types";
import { canAccessSensitive } from "@/lib/roles";

type EntityInvoiceOpts = {
  capability: Capability;
  table: string;
  id: string;
  description: string;
  amount: number;
  customerId?: string | null;
  sourceType: string;
  isDeposit?: boolean;
  /**
   * Entity column that stores this invoice link.
   * Hotel deposits use `deposit_invoice_id` so stay folio can still bill on `invoice_id`.
   */
  entityInvoiceColumn?: "invoice_id" | "deposit_invoice_id";
  revalidatePaths: string[];
  markStatus?: string;
  /** When true, only create the invoice (no entity row update). */
  skipEntityUpdate?: boolean;
  /** Require supervisor+ for money create (default true). */
  requireSensitiveRole?: boolean;
};

async function createLinkedInvoice(opts: EntityInvoiceOpts) {
  const { supabase, organization, profile, membership } =
    await requireMemberWithCapability(opts.capability);
  const requireSensitive = opts.requireSensitiveRole !== false;
  if (requireSensitive && !canAccessSensitive(membership.role)) {
    return { error: "Manager / supervisor approval required to create invoices from jobs" };
  }
  const amount = Math.max(0, Number(opts.amount) || 0);
  if (amount <= 0) return { error: "Amount must be greater than 0" };

  const linkCol =
    opts.entityInvoiceColumn ||
    (opts.isDeposit && opts.table === "hotel_stays"
      ? "deposit_invoice_id"
      : "invoice_id");

  // Idempotency: reuse existing invoice for same source entity + type
  const { data: existingInv } = await supabase
    .from("invoices")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("source_type", opts.sourceType)
    .eq("source_entity_id", opts.id)
    .limit(1)
    .maybeSingle();
  if (existingInv?.id) {
    return { success: true, invoiceId: existingInv.id as string };
  }

  if (!opts.skipEntityUpdate && opts.table !== "invoices") {
    const { data: entity } = await supabase
      .from(opts.table)
      .select(`id, ${linkCol}`)
      .eq("id", opts.id)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!entity) return { error: "Source record not found" };
    const linkedId = (entity as Record<string, unknown>)[linkCol];
    if (linkedId) {
      return { success: true, invoiceId: linkedId as string };
    }
  }

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
      customer_id: opts.customerId || null,
      invoice_number: invoiceNumber,
      title: opts.description,
      status: "unpaid" as InvoiceStatus,
      subtotal: amount,
      tax_amount: 0,
      total: amount,
      amount_paid: 0,
      source_type: opts.sourceType,
      source_entity_id: opts.id,
      is_deposit: !!opts.isDeposit,
      created_by: profile.id,
      created_by_name: profile.full_name || profile.email || "Staff",
    })
    .select("id")
    .single();

  if (error || !invoice) {
    // Unique source race — return the winner
    if (error?.code === "23505" || /duplicate|unique/i.test(error?.message || "")) {
      const { data: raced } = await supabase
        .from("invoices")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("source_type", opts.sourceType)
        .eq("source_entity_id", opts.id)
        .maybeSingle();
      if (raced?.id) return { success: true, invoiceId: raced.id as string };
    }
    return { error: error?.message || "Invoice failed" };
  }

  const { error: lineError } = await supabase.from("invoice_lines").insert({
    organization_id: organization.id,
    invoice_id: invoice.id,
    description: opts.description,
    quantity: 1,
    unit_price: amount,
    line_total: amount,
  });
  if (lineError) {
    return { error: lineError.message, invoiceId: invoice.id as string };
  }

  if (!opts.skipEntityUpdate && opts.table !== "invoices") {
    const patch: Record<string, unknown> = { [linkCol]: invoice.id };
    if (opts.markStatus) {
      patch.status = opts.markStatus;
      patch.status_changed_at = new Date().toISOString();
    }
    const { data: linked, error: linkError } = await supabase
      .from(opts.table)
      .update(patch)
      .eq("id", opts.id)
      .eq("organization_id", organization.id)
      .is(linkCol, null)
      .select("id");
    if (linkError) {
      return { error: linkError.message, invoiceId: invoice.id as string };
    }
    if (!linked?.length) {
      // Lost race — another invoice may already be linked on this column
      const { data: again } = await supabase
        .from(opts.table)
        .select(linkCol)
        .eq("id", opts.id)
        .maybeSingle();
      const againId = again
        ? (again as Record<string, unknown>)[linkCol]
        : null;
      if (againId && againId !== invoice.id) {
        return {
          success: true,
          invoiceId: againId as string,
        };
      }
    }
  }

  await logActivity({
    action: `pipeline.invoice.${opts.sourceType}`,
    summary: `Invoice ${invoiceNumber} from ${opts.sourceType}`,
    entityType: "invoice",
    entityId: invoice.id,
    meta: { sourceId: opts.id, linkCol },
  });

  revalidateApp("/invoices", ...opts.revalidatePaths);
  return { success: true, invoiceId: invoice.id as string };
}

async function updateEntityStatus(
  capability: Capability,
  table: string,
  formData: FormData,
  allowed: string[],
  paths: string[],
  extra?: (status: string) => Record<string, unknown>
) {
  const { supabase, organization, profile } =
    await requireMemberWithCapability(capability);
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !status) return { error: "Missing id/status" };
  if (!allowed.includes(status)) return { error: "Invalid status" };

  const patch: Record<string, unknown> = {
    status,
    status_changed_at: new Date().toISOString(),
    ...(extra ? extra(status) : {}),
  };

  const { error } = await supabase
    .from(table)
    .update(patch)
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) return { error: error.message };

  await logActivity({
    action: `pipeline.${table}.status`,
    summary: `Status → ${status}`,
    entityType: table,
    entityId: id,
    meta: { by: profile.id, status },
  });
  revalidateApp(...paths);
  return { success: true };
}

export async function updateJobStatusAction(formData: FormData) {
  return updateEntityStatus(
    "job_cards",
    "job_cards",
    formData,
    ["intake", "diagnosis", "waiting_parts", "in_progress", "qc", "ready", "delivered"],
    ["/jobs", "/staff-dashboard"]
  );
}

export async function invoiceFromJobAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("job_cards");
  const id = String(formData.get("id") || "");
  const { data: job } = await supabase
    .from("job_cards")
    .select("id, title, customer_id, labour_amount, parts_amount, invoice_id")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!job) return { error: "Job not found" };
  if (job.invoice_id) return { error: "Job already invoiced", invoiceId: job.invoice_id as string };

  const { data: lines } = await supabase
    .from("job_card_lines")
    .select("description, amount, quantity")
    .eq("job_id", id);

  let amount =
    Number(job.labour_amount || 0) + Number(job.parts_amount || 0);
  if (lines?.length) {
    // `amount` is treated as line total (legacy job_card_lines); quantity scales only when > 1
    amount = lines.reduce((s, l) => {
      const qty = Number(l.quantity || 1);
      const amt = Number(l.amount || 0);
      return s + (qty > 1 ? amt * qty : amt);
    }, 0);
  }
  if (amount <= 0) amount = Number(formData.get("amount") || 0);
  if (amount <= 0) return { error: "Add labour/parts amount on the job first" };

  return createLinkedInvoice({
    capability: "job_cards",
    table: "job_cards",
    id,
    description: `Job: ${job.title}`,
    amount,
    customerId: job.customer_id,
    sourceType: "job_card",
    revalidatePaths: ["/jobs"],
  });
}

export async function updateLaundryStatusAction(formData: FormData) {
  return updateEntityStatus(
    "laundry_tickets",
    "laundry_tickets",
    formData,
    ["received", "washing", "ready", "collected"],
    ["/laundry", "/staff-dashboard"],
    (status) => {
      if (status === "ready") return { ready_at: new Date().toISOString() };
      if (status === "collected") return { collected_at: new Date().toISOString() };
      return {};
    }
  );
}

export async function invoiceFromLaundryAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("laundry_tickets");
  const id = String(formData.get("id") || "");
  const { data: row } = await supabase
    .from("laundry_tickets")
    .select("id, ticket_number, customer_id, amount, invoice_id, item_count")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!row) return { error: "Ticket not found" };
  if (row.invoice_id) return { error: "Already invoiced", invoiceId: row.invoice_id as string };
  const amount = Number(row.amount || formData.get("amount") || 0);
  if (amount <= 0) return { error: "Set ticket amount before invoicing" };
  return createLinkedInvoice({
    capability: "laundry_tickets",
    table: "laundry_tickets",
    id,
    description: `Laundry ${row.ticket_number} (${row.item_count} items)`,
    amount,
    customerId: row.customer_id,
    sourceType: "laundry_ticket",
    revalidatePaths: ["/laundry"],
  });
}

export async function updateShipmentStatusAction(formData: FormData) {
  return updateEntityStatus(
    "courier_tracking",
    "courier_shipments",
    formData,
    [
      "created",
      "picked_up",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "failed",
      "returned",
    ],
    ["/shipments", "/staff-dashboard"],
    (status) => {
      // Delivered ≠ COD collected — remittance is a separate money action
      if (status === "delivered") {
        return { delivered_at: new Date().toISOString() };
      }
      return {};
    }
  );
}

export async function invoiceFromShipmentAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("courier_tracking");
  const id = String(formData.get("id") || "");
  const { data: row } = await supabase
    .from("courier_shipments")
    .select("id, tracking_no, customer_id, amount, invoice_id, status")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!row) return { error: "Shipment not found" };
  if (row.invoice_id) return { error: "Already invoiced", invoiceId: row.invoice_id as string };
  if (row.status !== "delivered") return { error: "Bill only after delivery" };
  const amount = Number(row.amount || formData.get("amount") || 0);
  if (amount <= 0) return { error: "Set shipment amount first" };
  return createLinkedInvoice({
    capability: "courier_tracking",
    table: "courier_shipments",
    id,
    description: `Delivery ${row.tracking_no}`,
    amount,
    customerId: row.customer_id,
    sourceType: "shipment",
    revalidatePaths: ["/shipments"],
  });
}

export async function updateSerialStatusAction(formData: FormData) {
  return updateEntityStatus(
    "serial_numbers",
    "product_serials",
    formData,
    ["in_stock", "sold", "returned", "defective", "written_off"],
    ["/serials", "/pos"],
    (status) => (status === "sold" ? { sold_at: new Date().toISOString() } : {})
  );
}

export async function updateLabOrderStatusAction(formData: FormData) {
  return updateEntityStatus(
    "lab_orders",
    "optical_lab_orders",
    formData,
    ["pending", "in_lab", "ready", "collected"],
    ["/lab-orders", "/staff-dashboard"],
    (status) => {
      if (status === "ready") return { ready_at: new Date().toISOString() };
      if (status === "collected") return { collected_at: new Date().toISOString() };
      return {};
    }
  );
}

export async function invoiceFromLabOrderAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("lab_orders");
  const id = String(formData.get("id") || "");
  const { data: row } = await supabase
    .from("optical_lab_orders")
    .select("id, frame_name, customer_id, sell_price, invoice_id, lens_type")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!row) return { error: "Lab order not found" };
  if (row.invoice_id) return { error: "Already invoiced", invoiceId: row.invoice_id as string };
  const amount = Number(row.sell_price || formData.get("amount") || 0);
  if (amount <= 0) return { error: "Set sell price on lab order first" };
  return createLinkedInvoice({
    capability: "lab_orders",
    table: "optical_lab_orders",
    id,
    description: `Optical job: ${row.frame_name || row.lens_type || "frame+lens"}`,
    amount,
    customerId: row.customer_id,
    sourceType: "optical_lab_order",
    revalidatePaths: ["/lab-orders"],
  });
}

export async function updateLabResultStatusAction(formData: FormData) {
  return updateEntityStatus(
    "lab_results",
    "lab_results",
    formData,
    ["pending", "collected", "processing", "ready", "delivered"],
    ["/lab-results", "/staff-dashboard"],
    (status) => {
      if (status === "collected") {
        return { sample_collected_at: new Date().toISOString() };
      }
      if (status === "ready") return { ready_at: new Date().toISOString() };
      if (status === "delivered") return { delivered_at: new Date().toISOString() };
      return {};
    }
  );
}

export async function invoiceFromLabResultAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("lab_results");
  const id = String(formData.get("id") || "");
  const { data: row } = await supabase
    .from("lab_results")
    .select("id, test_name, customer_id, amount, invoice_id")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!row) return { error: "Result not found" };
  if (row.invoice_id) return { error: "Already invoiced", invoiceId: row.invoice_id as string };
  const amount = Number(row.amount || formData.get("amount") || 0);
  if (amount <= 0) return { error: "Set test amount first" };
  return createLinkedInvoice({
    capability: "lab_results",
    table: "lab_results",
    id,
    description: `Lab test: ${row.test_name}`,
    amount,
    customerId: row.customer_id,
    sourceType: "lab_result",
    revalidatePaths: ["/lab-results"],
  });
}

export async function updateRoomStatusAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("rooms");
  const id = String(formData.get("id") || "");
  const next = String(formData.get("status") || "");
  const allowed = ["vacant", "dirty", "occupied", "reserved", "ooo"] as const;
  if (!id || !allowed.includes(next as (typeof allowed)[number])) {
    return { error: "Invalid room status" };
  }

  const { data: room } = await supabase
    .from("hotel_rooms")
    .select("id, status")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!room) return { error: "Room not found" };
  const from = String(room.status || "vacant");

  // Occupancy must go through stay lifecycle (check-in / check-out)
  if (next === "occupied" && from !== "occupied") {
    return { error: "Use Check-in to mark a room occupied" };
  }
  if (from === "occupied" && next !== "occupied") {
    return { error: "Use Check-out to free an occupied room" };
  }
  if (from === "ooo" && next === "occupied") {
    return { error: "Room is out of order" };
  }

  const { error } = await supabase
    .from("hotel_rooms")
    .update({
      status: next,
      status_changed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", organization.id)
    .eq("status", from);
  if (error) return { error: error.message };

  revalidateApp("/rooms", "/staff-dashboard");
  return { success: true };
}

export async function updateTableStatusAction(formData: FormData) {
  return updateEntityStatus(
    "tables_kot",
    "dining_tables",
    formData,
    ["free", "occupied", "bill", "dirty"],
    ["/tables", "/pos", "/staff-dashboard"]
  );
}

export async function updateAppointmentQueueAction(formData: FormData) {
  const { supabase, organization, profile } =
    await requireMemberWithCapability("appointments");
  const id = String(formData.get("id") || "");
  const queueStatus = String(formData.get("status") || "");
  const allowed = ["waiting", "called", "in_room", "completed", "no_show"];
  if (!id || !allowed.includes(queueStatus)) return { error: "Invalid queue status" };

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!appt) return { error: "Appointment not found" };
  if (appt.status === "cancelled") {
    return { error: "Cancelled appointments cannot enter the queue" };
  }

  const patch: Record<string, unknown> = { queue_status: queueStatus };
  if (queueStatus === "waiting") {
    patch.waiting_started_at = new Date().toISOString();
    patch.checked_in_at = new Date().toISOString();
    if (appt.status === "scheduled" || appt.status === "confirmed") {
      patch.status = "confirmed";
    }
  }
  if (queueStatus === "completed") patch.status = "completed";
  if (queueStatus === "no_show") patch.status = "no_show";

  const { error } = await supabase
    .from("appointments")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { error: error.message };

  await logActivity({
    action: "pipeline.appointment.queue",
    summary: `Queue → ${queueStatus}`,
    entityType: "appointment",
    entityId: id,
    meta: { by: profile.id },
  });
  revalidateApp("/appointments", "/queue", "/staff-dashboard");
  return { success: true };
}

export async function saveClinicalNotesAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("appointments");
  const id = String(formData.get("id") || "");
  const notes = String(formData.get("clinical_notes") || "").trim();
  if (!id) return { error: "Appointment required" };
  const { error } = await supabase
    .from("appointments")
    .update({ clinical_notes: notes || null })
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { error: error.message };
  revalidateApp("/appointments", "/clinical-notes", "/queue");
  return { success: true };
}

export async function createMedicalLetterAction(formData: FormData) {
  const { supabase, organization, profile } =
    await requireMemberWithCapability("appointments");
  const customerId = String(formData.get("customer_id") || "");
  const letterType = String(formData.get("letter_type") || "mc");
  const daysOff = Number(formData.get("days_off") || 1);
  const body = String(formData.get("body") || "").trim();
  const appointmentId = String(formData.get("appointment_id") || "") || null;
  if (!customerId || !body) return { error: "Patient and letter body required" };

  const { data, error } = await supabase
    .from("medical_letters")
    .insert({
      organization_id: organization.id,
      customer_id: customerId,
      appointment_id: appointmentId,
      letter_type: letterType,
      days_off: daysOff,
      body,
      created_by_name: profile.full_name || profile.email || "Staff",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  await logActivity({
    action: "clinic.medical_letter.create",
    summary: `Issued ${letterType}`,
    entityType: "medical_letter",
    entityId: data.id,
  });
  revalidateApp("/mc-letters", "/customers");
  return { success: true };
}

export async function useSessionPackageAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("session_packages");
  const packageId = String(formData.get("package_id") || "");
  const notes = String(formData.get("notes") || "") || null;
  if (!packageId) return { error: "Package required" };

  const { data: pkg } = await supabase
    .from("session_packages")
    .select("id, total_sessions, used_sessions, status, expires_on")
    .eq("id", packageId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!pkg) return { error: "Package not found" };
  if (pkg.status === "expired" || pkg.status === "finished") {
    return { error: "Package is not active" };
  }
  if (pkg.expires_on && pkg.expires_on < new Date().toISOString().slice(0, 10)) {
    await supabase
      .from("session_packages")
      .update({ status: "expired" })
      .eq("id", packageId);
    return { error: "Package expired" };
  }
  if (Number(pkg.used_sessions) >= Number(pkg.total_sessions)) {
    return { error: "No sessions remaining" };
  }

  const used = Number(pkg.used_sessions) + 1;
  const finished = used >= Number(pkg.total_sessions);
  const { data: claimed, error: claimError } = await supabase
    .from("session_packages")
    .update({
      used_sessions: used,
      last_used_at: new Date().toISOString(),
      status: finished ? "finished" : "active",
    })
    .eq("id", packageId)
    .eq("organization_id", organization.id)
    .eq("used_sessions", pkg.used_sessions)
    .lt("used_sessions", pkg.total_sessions)
    .select("id, used_sessions, total_sessions");
  if (claimError) return { error: claimError.message };
  if (!claimed?.length) {
    return { error: "Session already used by another staff member — refresh and retry" };
  }
  await supabase.from("session_package_uses").insert({
    organization_id: organization.id,
    package_id: packageId,
    notes,
  });

  revalidateApp("/packages", "/staff-dashboard");
  return { success: true, remaining: Number(pkg.total_sessions) - used };
}

export async function renewMembershipAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("memberships");
  const id = String(formData.get("id") || "");
  const days = Math.max(1, Number(formData.get("days") || 30));
  const { data: row } = await supabase
    .from("gym_memberships")
    .select("id, ends_on")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!row) return { error: "Membership not found" };
  const base = row.ends_on && row.ends_on > new Date().toISOString().slice(0, 10)
    ? new Date(row.ends_on)
    : new Date();
  base.setDate(base.getDate() + days);
  const ends = base.toISOString().slice(0, 10);
  const { error } = await supabase
    .from("gym_memberships")
    .update({ status: "active", ends_on: ends, freeze_reason: null, frozen_until: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateApp("/memberships", "/staff-dashboard");
  return { success: true };
}

export async function freezeMembershipAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("memberships");
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "Paused").trim();
  const until = String(formData.get("frozen_until") || "") || null;
  const { error } = await supabase
    .from("gym_memberships")
    .update({ status: "frozen", freeze_reason: reason, frozen_until: until })
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { error: error.message };
  revalidateApp("/memberships");
  return { success: true };
}

export async function createDepositInvoiceAction(formData: FormData) {
  const customerId = String(formData.get("customer_id") || "") || null;
  const amount = Number(formData.get("amount") || 0);
  const description = String(formData.get("description") || "Deposit").trim();
  const sourceType = String(formData.get("source_type") || "deposit");
  const sourceId = String(formData.get("source_id") || "") || crypto.randomUUID();
  if (amount <= 0) return { error: "Deposit amount required" };

  // Deposits are invoice-capability for all niches that bill.
  return createLinkedInvoice({
    capability: "invoices",
    table: "invoices",
    id: sourceId,
    description,
    amount,
    customerId,
    sourceType,
    isDeposit: true,
    skipEntityUpdate: true,
    revalidatePaths: ["/invoices", "/money"],
  });
}

export async function recordControlledDrugAction(formData: FormData) {
  const { supabase, organization, profile } =
    await requireMemberWithCapability("rx_attach");
  const productId = String(formData.get("product_id") || "") || null;
  const batchId = String(formData.get("batch_id") || "") || null;
  const customerId = String(formData.get("customer_id") || "") || null;
  const quantity = Number(formData.get("quantity") || 1);
  const rxReference = String(formData.get("rx_reference") || "") || null;
  const notes = String(formData.get("notes") || "") || null;
  if (quantity <= 0) return { error: "Quantity required" };

  const { data, error } = await supabase
    .from("controlled_drug_logs")
    .insert({
      organization_id: organization.id,
      product_id: productId,
      batch_id: batchId,
      customer_id: customerId,
      quantity,
      rx_reference: rxReference,
      staff_name: profile.full_name || profile.email || "Staff",
      notes,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (batchId) {
    const { data: batch } = await supabase
      .from("product_batches")
      .select("id, quantity")
      .eq("id", batchId)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (batch) {
      await supabase
        .from("product_batches")
        .update({ quantity: Math.max(0, Number(batch.quantity) - quantity) })
        .eq("id", batchId);
    }
  }

  await logActivity({
    action: "pharmacy.controlled_log",
    summary: `Controlled dispense qty ${quantity}`,
    entityType: "controlled_drug_log",
    entityId: data.id,
  });
  revalidateApp("/controlled-register", "/batches", "/pos");
  return { success: true };
}

export async function suggestFefoBatchAction(productId: string) {
  const { supabase, organization } = await requireMemberWithCapability("batch_expiry");
  const { data } = await supabase
    .from("product_batches")
    .select("id, lot_number, expiry_date, quantity, quarantined")
    .eq("organization_id", organization.id)
    .eq("product_id", productId)
    .gt("quantity", 0)
    .eq("quarantined", false)
    .order("expiry_date", { ascending: true, nullsFirst: false })
    .limit(5);
  return { batches: data || [] };
}

export async function hotelCheckInAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("rooms");
  const roomId = String(formData.get("room_id") || "");
  const guestName = String(formData.get("guest_name") || "").trim();
  const customerId = String(formData.get("customer_id") || "") || null;
  const departureOn = String(formData.get("departure_on") || "");
  const rate = Number(formData.get("rate") || 0);
  const deposit = Number(formData.get("deposit_amount") || 0);
  if (!roomId || !guestName || !departureOn) {
    return { error: "Room, guest name and departure date required" };
  }

  const { data: room } = await supabase
    .from("hotel_rooms")
    .select("id, status")
    .eq("id", roomId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!room) return { error: "Room not found" };
  if (!["vacant", "dirty"].includes(room.status || "")) {
    return { error: "Room is not available for check-in" };
  }

  const arrival = new Date().toISOString().slice(0, 10);
  const { data: stay, error } = await supabase
    .from("hotel_stays")
    .insert({
      organization_id: organization.id,
      room_id: roomId,
      customer_id: customerId,
      guest_name: guestName,
      arrival_on: arrival,
      departure_on: departureOn,
      status: "in_house",
      rate,
      deposit_amount: deposit,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { data: claimedRooms, error: roomErr } = await supabase
    .from("hotel_rooms")
    .update({
      status: "occupied",
      current_guest_id: customerId,
      current_guest_name: guestName,
      check_in_at: new Date().toISOString(),
      check_out_on: departureOn,
      folio_balance: rate,
      status_changed_at: new Date().toISOString(),
    })
    .eq("id", roomId)
    .eq("organization_id", organization.id)
    .in("status", ["vacant", "dirty"])
    .select("id");
  if (roomErr || !claimedRooms?.length) {
    // Stay row without room claim → roll back stay
    await supabase.from("hotel_stays").delete().eq("id", stay.id);
    return { error: roomErr?.message || "Room was taken by another check-in" };
  }

  let invoiceId: string | undefined;
  if (deposit > 0) {
    const inv = await createLinkedInvoice({
      capability: "rooms",
      table: "hotel_stays",
      id: stay.id,
      description: `Deposit — ${guestName}`,
      amount: deposit,
      customerId,
      sourceType: "hotel_deposit",
      isDeposit: true,
      entityInvoiceColumn: "deposit_invoice_id",
      revalidatePaths: ["/rooms"],
    });
    if ("invoiceId" in inv) invoiceId = inv.invoiceId;
  }

  revalidateApp("/rooms", "/staff-dashboard");
  return { success: true, stayId: stay.id, invoiceId };
}

export async function hotelCheckOutAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("rooms");
  const roomId = String(formData.get("room_id") || "");
  const { data: room } = await supabase
    .from("hotel_rooms")
    .select("id, status, current_guest_name, folio_balance, current_guest_id, rate, invoice_id")
    .eq("id", roomId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!room) return { error: "Room not found" };
  if (room.status !== "occupied") {
    return { error: "Room is not occupied" };
  }

  // Bill folio only — never fall back to rate on empty folio (prevents double-bill)
  const folio = Number(room.folio_balance || 0);

  const { data: stay } = await supabase
    .from("hotel_stays")
    .select("id, invoice_id, deposit_invoice_id, deposit_amount")
    .eq("room_id", roomId)
    .eq("organization_id", organization.id)
    .eq("status", "in_house")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Credit deposit against folio so guests are not double-charged
  let depositCredit = Math.max(0, Number(stay?.deposit_amount || 0));
  if (stay?.deposit_invoice_id) {
    const { data: depInv } = await supabase
      .from("invoices")
      .select("id, total, amount_paid, status")
      .eq("id", stay.deposit_invoice_id)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (depInv && depInv.status !== "void") {
      const paid = Number(depInv.amount_paid || 0);
      // Prefer recorded payments; else hold amount on stay (cash taken at check-in)
      depositCredit = Math.max(paid, depositCredit, Number(depInv.total || 0));
      if (depInv.status !== "paid") {
        await supabase
          .from("invoices")
          .update({
            amount_paid: Number(depInv.total),
            status: "paid",
            title: `Deposit applied — ${room.current_guest_name || "Guest"}`,
          })
          .eq("id", depInv.id)
          .in("status", ["unpaid", "partial", "draft"]);
      }
    }
  }
  depositCredit = Math.min(depositCredit, folio);
  const amount = Math.max(0, Math.round((folio - depositCredit) * 100) / 100);

  // Folio uses stay.invoice_id only — never deposit_invoice_id
  let invoiceId: string | undefined = stay?.invoice_id || undefined;
  if (amount > 0 && stay?.id) {
    const inv = await createLinkedInvoice({
      capability: "rooms",
      table: "hotel_stays",
      id: stay.id,
      description: `Stay — ${room.current_guest_name || "Guest"}${
        depositCredit > 0 ? ` (folio RM ${folio.toFixed(2)} − deposit RM ${depositCredit.toFixed(2)})` : ""
      }`,
      amount,
      customerId: room.current_guest_id,
      sourceType: "hotel_stay",
      entityInvoiceColumn: "invoice_id",
      revalidatePaths: ["/rooms"],
    });
    if ("error" in inv && inv.error && !("invoiceId" in inv && inv.invoiceId)) {
      return { error: inv.error };
    }
    if ("invoiceId" in inv) invoiceId = inv.invoiceId;
  }

  const { error: roomErr } = await supabase
    .from("hotel_rooms")
    .update({
      status: "dirty",
      current_guest_id: null,
      current_guest_name: null,
      check_in_at: null,
      check_out_on: null,
      folio_balance: 0,
      invoice_id: invoiceId || null,
      status_changed_at: new Date().toISOString(),
    })
    .eq("id", roomId)
    .eq("status", "occupied");
  if (roomErr) {
    return { error: roomErr.message, invoiceId };
  }

  if (stay?.id) {
    await supabase
      .from("hotel_stays")
      .update({ status: "checked_out", invoice_id: invoiceId || stay.invoice_id })
      .eq("id", stay.id)
      .eq("status", "in_house");
  }

  revalidateApp("/rooms", "/staff-dashboard", "/invoices");
  return { success: true, invoiceId };
}

export async function createTermFeeAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("term_fees");
  const customerId = String(formData.get("customer_id") || "");
  const termName = String(formData.get("term_name") || "").trim();
  const total = Number(formData.get("total_amount") || 0);
  const dueOn = String(formData.get("due_on") || "") || null;
  if (!customerId || !termName || total <= 0) {
    return { error: "Student, term name and amount required" };
  }
  const { data, error } = await supabase
    .from("tuition_term_fees")
    .insert({
      organization_id: organization.id,
      customer_id: customerId,
      term_name: termName,
      total_amount: total,
      paid_amount: 0,
      status: "outstanding",
      due_on: dueOn,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidateApp("/term-fees", "/staff-dashboard");
  return { success: true, id: data.id };
}

export async function invoiceTermFeeAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("term_fees");
  const id = String(formData.get("id") || "");
  const { data: row } = await supabase
    .from("tuition_term_fees")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!row) return { error: "Term fee not found" };
  if (row.invoice_id) return { error: "Already invoiced", invoiceId: row.invoice_id as string };
  const outstanding = Number(row.total_amount) - Number(row.paid_amount);
  if (outstanding <= 0) return { error: "Nothing outstanding" };
  return createLinkedInvoice({
    capability: "term_fees",
    table: "tuition_term_fees",
    id,
    description: `Term fee: ${row.term_name}`,
    amount: outstanding,
    customerId: row.customer_id,
    sourceType: "term_fee",
    revalidatePaths: ["/term-fees"],
  });
}

export async function createPtPackageAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("pt_sessions");
  const customerId = String(formData.get("customer_id") || "");
  const packageName = String(formData.get("package_name") || "PT package").trim();
  const total = Math.max(1, Number(formData.get("total_sessions") || 10));
  const trainer = String(formData.get("trainer_name") || "") || null;
  if (!customerId) return { error: "Member required" };
  const { error } = await supabase.from("gym_pt_sessions").insert({
    organization_id: organization.id,
    customer_id: customerId,
    package_name: packageName,
    total_sessions: total,
    used_sessions: 0,
    trainer_name: trainer,
    status: "active",
  });
  if (error) return { error: error.message };
  revalidateApp("/pt-sessions");
  return { success: true };
}

export async function usePtSessionAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("pt_sessions");
  const id = String(formData.get("id") || "");
  const { data: row } = await supabase
    .from("gym_pt_sessions")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!row) return { error: "PT package not found" };
  if (Number(row.used_sessions) >= Number(row.total_sessions)) {
    return { error: "No PT sessions left" };
  }
  const used = Number(row.used_sessions) + 1;
  const { data: claimed, error } = await supabase
    .from("gym_pt_sessions")
    .update({
      used_sessions: used,
      status: used >= Number(row.total_sessions) ? "finished" : "active",
    })
    .eq("id", id)
    .eq("organization_id", organization.id)
    .eq("used_sessions", row.used_sessions)
    .lt("used_sessions", row.total_sessions)
    .select("id");
  if (error) return { error: error.message };
  if (!claimed?.length) {
    return { error: "Session already used by another staff member — refresh and retry" };
  }
  revalidateApp("/pt-sessions", "/staff-dashboard");
  return { success: true };
}

export async function createPetVaccinationAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("pet_vaccinations");
  const petId = String(formData.get("pet_id") || "");
  const vaccineName = String(formData.get("vaccine_name") || "").trim();
  const givenOn = String(formData.get("given_on") || "") || null;
  const dueOn = String(formData.get("due_on") || "") || null;
  const batchLot = String(formData.get("batch_lot") || "") || null;
  if (!petId || !vaccineName) return { error: "Pet and vaccine required" };
  const { error } = await supabase.from("pet_vaccinations").insert({
    organization_id: organization.id,
    pet_id: petId,
    vaccine_name: vaccineName,
    given_on: givenOn,
    due_on: dueOn,
    batch_lot: batchLot,
  });
  if (error) return { error: error.message };
  revalidateApp("/vaccinations", "/pets");
  return { success: true };
}

export async function createPrescriptionAttachAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("rx_attach");
  const customerId = String(formData.get("customer_id") || "") || null;
  const referenceNo = String(formData.get("reference_no") || "").trim();
  const notes = String(formData.get("notes") || "") || null;
  if (!referenceNo) return { error: "Rx reference required" };
  const { error } = await supabase.from("prescription_attachments").insert({
    organization_id: organization.id,
    customer_id: customerId,
    reference_no: referenceNo,
    notes,
  });
  if (error) return { error: error.message };
  revalidateApp("/rx-attach");
  return { success: true };
}

export async function recordCommissionEntryAction(formData: FormData) {
  const { supabase, organization } = await requireMemberWithCapability("commissions");
  const staffName = String(formData.get("staff_name") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const note = String(formData.get("note") || "") || null;
  if (!staffName || amount <= 0) return { error: "Staff and amount required" };
  const { error } = await supabase.from("salon_commission_entries").insert({
    organization_id: organization.id,
    staff_name: staffName,
    amount,
    note,
    source_type: "manual",
  });
  if (error) return { error: error.message };
  revalidateApp("/commissions");
  return { success: true };
}

export async function assignCustomerPriceTierAction(formData: FormData) {
  const { supabase, organization, membership } =
    await requireMemberWithCapability("price_tiers");
  if (!canAccessSensitive(membership.role)) {
    return { error: "Manager / supervisor approval required to assign price tiers" };
  }
  const customerId = String(formData.get("customer_id") || "");
  const tierId = String(formData.get("price_tier_id") || "") || null;
  if (!customerId) return { error: "Customer required" };
  if (tierId) {
    const { data: tier } = await supabase
      .from("price_tiers")
      .select("id")
      .eq("id", tierId)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!tier) return { error: "Price tier not found in this organisation" };
  }
  const { error } = await supabase
    .from("customers")
    .update({ price_tier_id: tierId })
    .eq("id", customerId)
    .eq("organization_id", organization.id);
  if (error) return { error: error.message };
  revalidateApp("/price-tiers", "/customers", "/pos", "/invoices");
  return { success: true };
}

export async function applyWholesaleTierPrice(
  productUnitPrice: number,
  customerId: string | null | undefined
) {
  if (!customerId) return { unitPrice: productUnitPrice, tierName: null as string | null };
  const { supabase, organization } = await requireMemberWithCapability("price_tiers");
  const { data: customer } = await supabase
    .from("customers")
    .select("price_tier_id")
    .eq("id", customerId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!customer?.price_tier_id) {
    return { unitPrice: productUnitPrice, tierName: null as string | null };
  }
  const { data: tier } = await supabase
    .from("price_tiers")
    .select("name, discount_percent")
    .eq("id", customer.price_tier_id)
    .maybeSingle();
  if (!tier) return { unitPrice: productUnitPrice, tierName: null as string | null };
  const pct = Number(tier.discount_percent || 0);
  const unitPrice = Math.round(productUnitPrice * (1 - pct / 100) * 100) / 100;
  return { unitPrice, tierName: tier.name as string };
}
