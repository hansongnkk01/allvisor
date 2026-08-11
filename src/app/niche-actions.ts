"use server";

import { revalidateApp } from "@/lib/revalidate";
import { logActivity } from "@/lib/activity";
import { requireMemberWithCapability } from "@/lib/require-capability";
import type { Capability } from "@/lib/niche-capabilities";

async function insertSimple(
  capability: Capability,
  table: string,
  payload: Record<string, unknown>,
  revalidatePaths: string[]
) {
  const { supabase, organization, profile } = await requireMemberWithCapability(capability);
  const row = { ...payload, organization_id: organization.id };
  const { data, error } = await supabase.from(table).insert(row).select("id").single();
  if (error) return { error: error.message };
  await logActivity({
    action: `niche.${table}.create`,
    summary: `Created ${table} record`,
    entityType: table,
    entityId: data.id,
    meta: { by: profile.id },
  });
  revalidateApp(...revalidatePaths);
  return { success: true };
}

export async function createSalonCommissionAction(formData: FormData) {
  return insertSimple(
    "commissions",
    "salon_commission_rules",
    {
      staff_name: String(formData.get("staff_name") || "").trim(),
      percent: Number(formData.get("percent") || 0),
    },
    ["/commissions"]
  );
}

export async function createProductBatchAction(formData: FormData) {
  return insertSimple(
    "batch_expiry",
    "product_batches",
    {
      product_id: String(formData.get("product_id") || ""),
      lot_number: String(formData.get("lot_number") || "").trim(),
      expiry_date: String(formData.get("expiry_date") || "") || null,
      quantity: Number(formData.get("quantity") || 0),
    },
    ["/batches", "/inventory", "/pos"]
  );
}

export async function createEyeRxAction(formData: FormData) {
  return insertSimple(
    "eye_rx",
    "eye_prescriptions",
    {
      customer_id: String(formData.get("customer_id") || ""),
      od_sph: String(formData.get("od_sph") || "") || null,
      od_cyl: String(formData.get("od_cyl") || "") || null,
      od_axis: String(formData.get("od_axis") || "") || null,
      os_sph: String(formData.get("os_sph") || "") || null,
      os_cyl: String(formData.get("os_cyl") || "") || null,
      os_axis: String(formData.get("os_axis") || "") || null,
      pd: String(formData.get("pd") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    },
    ["/eye-rx", "/customers"]
  );
}

export async function createLabOrderAction(formData: FormData) {
  return insertSimple(
    "lab_orders",
    "optical_lab_orders",
    {
      customer_id: String(formData.get("customer_id") || "") || null,
      prescription_id: String(formData.get("prescription_id") || "") || null,
      frame_name: String(formData.get("frame_name") || "").trim() || null,
      lens_type: String(formData.get("lens_type") || "") || null,
      coating: String(formData.get("coating") || "") || null,
      lab_name: String(formData.get("lab_name") || "") || null,
      lab_cost: Number(formData.get("lab_cost") || 0),
      sell_price: Number(formData.get("sell_price") || 0),
      expected_ready_on: String(formData.get("expected_ready_on") || "") || null,
      status: String(formData.get("status") || "pending"),
      notes: String(formData.get("notes") || "") || null,
      status_changed_at: new Date().toISOString(),
    },
    ["/lab-orders"]
  );
}

export async function createTuitionClassAction(formData: FormData) {
  return insertSimple(
    "class_schedule",
    "tuition_classes",
    {
      name: String(formData.get("name") || "").trim(),
      schedule: String(formData.get("schedule") || "") || null,
      fee: Number(formData.get("fee") || 0),
    },
    ["/classes"]
  );
}

export async function createAttendanceAction(formData: FormData) {
  return insertSimple(
    "attendance",
    "tuition_attendance",
    {
      class_id: String(formData.get("class_id") || ""),
      customer_id: String(formData.get("customer_id") || ""),
      attended_on: String(formData.get("attended_on") || new Date().toISOString().slice(0, 10)),
      present: formData.get("present") === "on" || formData.get("present") === "true",
    },
    ["/attendance"]
  );
}

export async function createVehicleAction(formData: FormData) {
  return insertSimple(
    "vehicle_profile",
    "vehicles",
    {
      customer_id: String(formData.get("customer_id") || "") || null,
      plate: String(formData.get("plate") || "").trim(),
      make: String(formData.get("make") || "") || null,
      model: String(formData.get("model") || "") || null,
      year: String(formData.get("year") || "") || null,
    },
    ["/vehicles"]
  );
}

export async function createJobCardAction(formData: FormData) {
  const promised = String(formData.get("promised_at") || "");
  return insertSimple(
    "job_cards",
    "job_cards",
    {
      vehicle_id: String(formData.get("vehicle_id") || "") || null,
      customer_id: String(formData.get("customer_id") || "") || null,
      title: String(formData.get("title") || "").trim(),
      status: String(formData.get("status") || "intake"),
      notes: String(formData.get("notes") || "") || null,
      assigned_to: String(formData.get("assigned_to") || "") || null,
      labour_amount: Number(formData.get("labour_amount") || 0),
      parts_amount: Number(formData.get("parts_amount") || 0),
      promised_at: promised ? new Date(`${promised}T17:00:00`).toISOString() : null,
      status_changed_at: new Date().toISOString(),
    },
    ["/jobs"]
  );
}

export async function createMembershipAction(formData: FormData) {
  return insertSimple(
    "memberships",
    "gym_memberships",
    {
      customer_id: String(formData.get("customer_id") || ""),
      plan_name: String(formData.get("plan_name") || "").trim(),
      starts_on: String(formData.get("starts_on") || new Date().toISOString().slice(0, 10)),
      ends_on: String(formData.get("ends_on") || "") || null,
      status: "active",
    },
    ["/memberships"]
  );
}

export async function createCheckinAction(formData: FormData) {
  const { supabase, organization, profile } =
    await requireMemberWithCapability("class_checkin");
  const customerId = String(formData.get("customer_id") || "");
  if (!customerId) return { error: "Member required" };

  const today = new Date().toISOString().slice(0, 10);
  const { data: membership } = await supabase
    .from("gym_memberships")
    .select("id, status, ends_on, frozen_until")
    .eq("organization_id", organization.id)
    .eq("customer_id", customerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { error: "No active membership — renew or unfreeze before check-in" };
  }
  if (membership.ends_on && String(membership.ends_on) < today) {
    return { error: "Membership expired" };
  }
  if (membership.frozen_until && String(membership.frozen_until) >= today) {
    return { error: "Membership is frozen" };
  }

  const { data, error } = await supabase
    .from("gym_checkins")
    .insert({
      organization_id: organization.id,
      customer_id: customerId,
      membership_id: membership.id,
    })
    .select("id")
    .single();
  if (error) {
    // membership_id column may be absent pre-migration — retry without it
    if (/membership_id|schema cache|column/i.test(error.message)) {
      const retry = await supabase
        .from("gym_checkins")
        .insert({ organization_id: organization.id, customer_id: customerId })
        .select("id")
        .single();
      if (retry.error) return { error: retry.error.message };
      revalidateApp("/checkins", "/memberships");
      return { success: true };
    }
    return { error: error.message };
  }

  await logActivity({
    action: "niche.gym_checkins.create",
    summary: "Member check-in",
    entityType: "gym_checkins",
    entityId: data.id,
    meta: { by: profile.id, membershipId: membership.id },
  });
  revalidateApp("/checkins", "/memberships");
  return { success: true };
}

export async function createPetAction(formData: FormData) {
  return insertSimple(
    "pet_profiles",
    "pets",
    {
      owner_id: String(formData.get("owner_id") || ""),
      name: String(formData.get("name") || "").trim(),
      species: String(formData.get("species") || "") || null,
      breed: String(formData.get("breed") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    },
    ["/pets"]
  );
}

export async function createVariantAction(formData: FormData) {
  return insertSimple(
    "variants",
    "product_variants",
    {
      product_id: String(formData.get("product_id") || ""),
      size: String(formData.get("size") || "") || null,
      color: String(formData.get("color") || "") || null,
      sku: String(formData.get("sku") || "") || null,
      barcode: String(formData.get("barcode") || "") || null,
      quantity: Number(formData.get("quantity") || 0),
    },
    ["/variants", "/inventory"]
  );
}

export async function createSerialAction(formData: FormData) {
  const warrantyMonths = Math.max(0, Number(formData.get("warranty_months") || 12));
  return insertSimple(
    "serial_numbers",
    "product_serials",
    {
      product_id: String(formData.get("product_id") || ""),
      serial_number: String(formData.get("serial_number") || "").trim(),
      status: "in_stock",
      warranty_months: warrantyMonths,
      notes: String(formData.get("notes") || "") || null,
    },
    ["/serials"]
  );
}

export async function createPriceTierAction(formData: FormData) {
  return insertSimple(
    "price_tiers",
    "price_tiers",
    {
      name: String(formData.get("name") || "").trim(),
      discount_percent: Number(formData.get("discount_percent") || 0),
    },
    ["/price-tiers"]
  );
}

export async function createLaundryTicketAction(formData: FormData) {
  return insertSimple(
    "laundry_tickets",
    "laundry_tickets",
    {
      customer_id: String(formData.get("customer_id") || "") || null,
      ticket_number: String(formData.get("ticket_number") || `L-${Date.now().toString().slice(-6)}`),
      status: "received",
      item_count: Number(formData.get("item_count") || 1),
      amount: Number(formData.get("amount") || 0),
      express: String(formData.get("express") || "false") === "true",
      special_instructions: String(formData.get("special_instructions") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      status_changed_at: new Date().toISOString(),
    },
    ["/laundry"]
  );
}

export async function createSessionPackageAction(formData: FormData) {
  return insertSimple(
    "session_packages",
    "session_packages",
    {
      customer_id: String(formData.get("customer_id") || ""),
      name: String(formData.get("name") || "").trim(),
      total_sessions: Number(formData.get("total_sessions") || 10),
      used_sessions: 0,
      expires_on: String(formData.get("expires_on") || "") || null,
      price_paid: Number(formData.get("price_paid") || 0),
      status: "active",
    },
    ["/packages"]
  );
}

export async function createLabResultAction(formData: FormData) {
  return insertSimple(
    "lab_results",
    "lab_results",
    {
      customer_id: String(formData.get("customer_id") || ""),
      test_name: String(formData.get("test_name") || "").trim(),
      status: String(formData.get("status") || "pending"),
      result_summary: String(formData.get("result_summary") || "") || null,
      result_value: String(formData.get("result_value") || "") || null,
      result_unit: String(formData.get("result_unit") || "") || null,
      reference_range: String(formData.get("reference_range") || "") || null,
      amount: Number(formData.get("amount") || 0),
      status_changed_at: new Date().toISOString(),
    },
    ["/lab-results"]
  );
}

export async function createDiningTableAction(formData: FormData) {
  return insertSimple(
    "tables_kot",
    "dining_tables",
    {
      name: String(formData.get("name") || "").trim(),
      seats: Number(formData.get("seats") || 4),
      status: "free",
    },
    ["/tables"]
  );
}

export async function createHotelRoomAction(formData: FormData) {
  return insertSimple(
    "rooms",
    "hotel_rooms",
    {
      room_number: String(formData.get("room_number") || "").trim(),
      room_type: String(formData.get("room_type") || "standard"),
      status: "vacant",
      rate: Number(formData.get("rate") || 0),
    },
    ["/rooms"]
  );
}

export async function createListingAction(formData: FormData) {
  return insertSimple("property_listings", "property_listings", {
    title: String(formData.get("title") || "").trim(),
    status: "available",
    notes: String(formData.get("notes") || "") || null,
  }, ["/listings"]);
}

export async function createShipmentAction(formData: FormData) {
  const tracking =
    String(formData.get("tracking_no") || "").trim() ||
    `AV-${Date.now().toString().slice(-8)}`;
  return insertSimple("courier_tracking", "courier_shipments", {
    tracking_no: tracking,
    status: "created",
    notes: String(formData.get("notes") || "") || null,
    customer_id: String(formData.get("customer_id") || "") || null,
    sender_name: String(formData.get("sender_name") || "") || null,
    receiver_name: String(formData.get("receiver_name") || "") || null,
    receiver_phone: String(formData.get("receiver_phone") || "") || null,
    pickup_address: String(formData.get("pickup_address") || "") || null,
    delivery_address: String(formData.get("delivery_address") || "") || null,
    service_type: String(formData.get("service_type") || "standard"),
    weight_kg: Number(formData.get("weight_kg") || 0) || null,
    amount: Number(formData.get("amount") || 0),
    cod_amount: Number(formData.get("cod_amount") || 0),
    rider_name: String(formData.get("rider_name") || "") || null,
    status_changed_at: new Date().toISOString(),
  }, ["/shipments"]);
}

export async function createProjectAction(formData: FormData) {
  return insertSimple("project_claims", "contractor_projects", {
    name: String(formData.get("name") || "").trim(),
    status: "active",
    claim_amount: Number(formData.get("claim_amount") || 0),
  }, ["/projects"]);
}

export async function createWorkOrderAction(formData: FormData) {
  return insertSimple("bom_wip", "manufacturing_orders", {
    name: String(formData.get("name") || "").trim(),
    status: "planned",
    notes: String(formData.get("notes") || "") || null,
  }, ["/work-orders"]);
}

export async function createMatterAction(formData: FormData) {
  return insertSimple("matter_billing", "legal_matters", {
    title: String(formData.get("title") || "").trim(),
    status: "open",
    notes: String(formData.get("notes") || "") || null,
  }, ["/matters"]);
}

export async function createEventPlanAction(formData: FormData) {
  return insertSimple("event_timeline", "event_plans", {
    title: String(formData.get("title") || "").trim(),
    event_date: String(formData.get("event_date") || "") || null,
    status: "planning",
  }, ["/events"]);
}

export async function createFarmPlotAction(formData: FormData) {
  return insertSimple("farm_plots", "farm_plots", {
    name: String(formData.get("name") || "").trim(),
    crop: String(formData.get("crop") || "") || null,
    status: "idle",
  }, ["/plots"]);
}
