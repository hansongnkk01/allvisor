const fs = require("fs");
const path = require("path");
const root = path.join("src", "app", "[locale]", "(app)");

function page(route, body) {
  const dir = path.join(root, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "page.tsx"), body.trim() + "\n");
}

page(
  "commissions",
  `import { NicheModulePage } from "@/components/NicheModulePage";
import { createSalonCommissionAction } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "commissions",
    title: "Commissions",
    subtitle: "Staff commission rules for salon services.",
    table: "salon_commission_rules",
    columns: ["staff_name", "percent", "created_at"],
    fields: [
      { name: "staff_name", label: "Staff name", required: true },
      { name: "percent", label: "Percent", type: "number", defaultValue: 10 },
    ],
    action: createSalonCommissionAction,
  });
}
`
);

const simple = [
  ["eye-rx", "eye_rx", "Eye prescriptions", "Optical Rx records per customer.", "eye_prescriptions", ["customer_id", "od_sph", "os_sph", "pd", "created_at"], "createEyeRxAction", [
    { name: "customer_id", label: "Customer ID", required: true },
    { name: "od_sph", label: "OD SPH" }, { name: "od_cyl", label: "OD CYL" }, { name: "od_axis", label: "OD Axis" },
    { name: "os_sph", label: "OS SPH" }, { name: "os_cyl", label: "OS CYL" }, { name: "os_axis", label: "OS Axis" },
    { name: "pd", label: "PD" }, { name: "notes", label: "Notes" },
  ]],
  ["lab-orders", "lab_orders", "Lab orders", "Frame/lens lab order tracking.", "optical_lab_orders", ["frame_name", "status", "customer_id", "created_at"], "createLabOrderAction", [
    { name: "customer_id", label: "Customer ID" }, { name: "frame_name", label: "Frame" }, { name: "status", label: "Status", defaultValue: "pending" }, { name: "notes", label: "Notes" },
  ]],
  ["classes", "class_schedule", "Classes", "Class schedule and fees.", "tuition_classes", ["name", "schedule", "fee", "created_at"], "createTuitionClassAction", [
    { name: "name", label: "Class name", required: true }, { name: "schedule", label: "Schedule" }, { name: "fee", label: "Fee", type: "number", defaultValue: 0 },
  ]],
  ["attendance", "attendance", "Attendance", "Mark student attendance.", "tuition_attendance", ["class_id", "customer_id", "attended_on", "present"], "createAttendanceAction", [
    { name: "class_id", label: "Class ID", required: true }, { name: "customer_id", label: "Student ID", required: true }, { name: "attended_on", label: "Date", type: "date" },
  ]],
  ["vehicles", "vehicle_profile", "Vehicles", "Customer vehicles for workshop jobs.", "vehicles", ["plate", "make", "model", "year", "customer_id"], "createVehicleAction", [
    { name: "plate", label: "Plate", required: true }, { name: "make", label: "Make" }, { name: "model", label: "Model" }, { name: "year", label: "Year" }, { name: "customer_id", label: "Customer ID" },
  ]],
  ["jobs", "job_cards", "Job cards", "Workshop job board.", "job_cards", ["title", "status", "vehicle_id", "customer_id", "created_at"], "createJobCardAction", [
    { name: "title", label: "Job title", required: true }, { name: "status", label: "Status", defaultValue: "intake" }, { name: "vehicle_id", label: "Vehicle ID" }, { name: "customer_id", label: "Customer ID" }, { name: "notes", label: "Notes" },
  ]],
  ["memberships", "memberships", "Memberships", "Gym membership plans.", "memberships", ["customer_id", "plan_name", "starts_on", "ends_on", "status"], "createMembershipAction", [
    { name: "customer_id", label: "Member ID", required: true }, { name: "plan_name", label: "Plan", required: true }, { name: "starts_on", label: "Starts", type: "date" }, { name: "ends_on", label: "Ends", type: "date" },
  ]],
  ["checkins", "class_checkin", "Check-ins", "Gym member check-ins.", "gym_checkins", ["customer_id", "checked_in_at"], "createCheckinAction", [
    { name: "customer_id", label: "Member ID", required: true },
  ]],
  ["pets", "pet_profiles", "Pets", "Pet profiles linked to owners.", "pets", ["name", "species", "breed", "owner_id", "created_at"], "createPetAction", [
    { name: "owner_id", label: "Owner customer ID", required: true }, { name: "name", label: "Pet name", required: true }, { name: "species", label: "Species" }, { name: "breed", label: "Breed" }, { name: "notes", label: "Notes" },
  ]],
  ["variants", "variants", "Variants", "Size/color variants for fashion stock.", "product_variants", ["product_id", "size", "color", "sku", "barcode", "quantity"], "createVariantAction", [
    { name: "product_id", label: "Product ID", required: true }, { name: "size", label: "Size" }, { name: "color", label: "Color" }, { name: "sku", label: "SKU" }, { name: "barcode", label: "Barcode" }, { name: "quantity", label: "Qty", type: "number", defaultValue: 0 },
  ]],
  ["serials", "serial_numbers", "Serial / IMEI", "Track serialised electronics units.", "product_serials", ["product_id", "serial_number", "status", "created_at"], "createSerialAction", [
    { name: "product_id", label: "Product ID", required: true }, { name: "serial_number", label: "Serial / IMEI", required: true },
  ]],
  ["price-tiers", "price_tiers", "Price tiers", "Wholesale customer discount tiers.", "price_tiers", ["name", "discount_percent", "created_at"], "createPriceTierAction", [
    { name: "name", label: "Tier name", required: true }, { name: "discount_percent", label: "Discount %", type: "number", defaultValue: 0 },
  ]],
  ["laundry", "laundry_tickets", "Laundry tickets", "Drop-off / ready / pickup tickets.", "laundry_tickets", ["ticket_number", "status", "item_count", "customer_id", "created_at"], "createLaundryTicketAction", [
    { name: "ticket_number", label: "Ticket #" }, { name: "customer_id", label: "Customer ID" }, { name: "item_count", label: "Items", type: "number", defaultValue: 1 }, { name: "notes", label: "Notes" },
  ]],
  ["packages", "session_packages", "Session packages", "Physio / package session tracking.", "session_packages", ["customer_id", "name", "total_sessions", "used_sessions"], "createSessionPackageAction", [
    { name: "customer_id", label: "Customer ID", required: true }, { name: "name", label: "Package", required: true }, { name: "total_sessions", label: "Total sessions", type: "number", defaultValue: 10 },
  ]],
  ["lab-results", "lab_results", "Lab results", "Diagnostic test results.", "lab_results", ["customer_id", "test_name", "status", "result_summary", "created_at"], "createLabResultAction", [
    { name: "customer_id", label: "Customer ID", required: true }, { name: "test_name", label: "Test", required: true }, { name: "status", label: "Status", defaultValue: "pending" }, { name: "result_summary", label: "Summary" },
  ]],
  ["tables", "tables_kot", "Tables", "Dining table map / status (F&B).", "dining_tables", ["name", "seats", "status", "created_at"], "createDiningTableAction", [
    { name: "name", label: "Table name", required: true }, { name: "seats", label: "Seats", type: "number", defaultValue: 4 },
  ]],
  ["rooms", "rooms", "Rooms", "Hotel room inventory and status.", "hotel_rooms", ["room_number", "room_type", "status", "rate"], "createHotelRoomAction", [
    { name: "room_number", label: "Room #", required: true }, { name: "room_type", label: "Type", defaultValue: "standard" }, { name: "rate", label: "Rate", type: "number", defaultValue: 0 },
  ]],
  ["listings", "property_listings", "Listings", "Property listings.", "property_listings", ["title", "status", "notes", "created_at"], "createListingAction", [
    { name: "title", label: "Title", required: true }, { name: "notes", label: "Notes" },
  ]],
  ["shipments", "courier_tracking", "Shipments", "Courier tracking.", "courier_shipments", ["tracking_no", "status", "notes", "created_at"], "createShipmentAction", [
    { name: "tracking_no", label: "Tracking #", required: true }, { name: "notes", label: "Notes" },
  ]],
  ["projects", "project_claims", "Projects", "Contractor projects / claims.", "contractor_projects", ["name", "status", "claim_amount", "created_at"], "createProjectAction", [
    { name: "name", label: "Project", required: true }, { name: "claim_amount", label: "Claim amount", type: "number", defaultValue: 0 },
  ]],
  ["work-orders", "bom_wip", "Work orders", "Manufacturing work orders.", "manufacturing_orders", ["name", "status", "notes", "created_at"], "createWorkOrderAction", [
    { name: "name", label: "Order", required: true }, { name: "notes", label: "Notes" },
  ]],
  ["matters", "matter_billing", "Matters", "Legal matters / retainers.", "legal_matters", ["title", "status", "notes", "created_at"], "createMatterAction", [
    { name: "title", label: "Matter", required: true }, { name: "notes", label: "Notes" },
  ]],
  ["events", "event_timeline", "Events", "Event plans and timelines.", "event_plans", ["title", "event_date", "status", "created_at"], "createEventPlanAction", [
    { name: "title", label: "Event", required: true }, { name: "event_date", label: "Date", type: "date" },
  ]],
  ["plots", "farm_plots", "Plots", "Farm plots and crops.", "farm_plots", ["name", "crop", "status", "created_at"], "createFarmPlotAction", [
    { name: "name", label: "Plot", required: true }, { name: "crop", label: "Crop" },
  ]],
];

for (const [route, cap, title, sub, table, cols, action, fields] of simple) {
  page(
    route,
    `import { NicheModulePage } from "@/components/NicheModulePage";
import { ${action} } from "@/app/niche-actions";

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return NicheModulePage({
    params,
    capability: "${cap}",
    title: ${JSON.stringify(title)},
    subtitle: ${JSON.stringify(sub)},
    table: "${table}",
    columns: ${JSON.stringify(cols)},
    fields: ${JSON.stringify(fields, null, 2)},
    action: ${action},
  });
}
`
  );
}

page(
  "batches",
  `import { NicheModulePage } from "@/components/NicheModulePage";
import { createProductBatchAction } from "@/app/niche-actions";
import { requireCapability } from "@/lib/require-capability";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireCapability(locale, "batch_expiry");
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .eq("organization_id", ctx.organization.id)
    .order("name");
  return NicheModulePage({
    params,
    capability: "batch_expiry",
    title: "Batches / expiry",
    subtitle: "Lot tracking and expiry for pharmacy inventory.",
    table: "product_batches",
    columns: ["lot_number", "product_id", "expiry_date", "quantity"],
    fields: [
      {
        name: "product_id",
        label: "Product",
        type: "select",
        required: true,
        options: (products || []).map((p) => ({ value: p.id, label: p.name })),
      },
      { name: "lot_number", label: "Lot number", required: true },
      { name: "expiry_date", label: "Expiry", type: "date" },
      { name: "quantity", label: "Qty", type: "number", defaultValue: 0 },
    ],
    action: createProductBatchAction,
  });
}
`
);

console.log("wrote", 1 + simple.length + 1, "pages");
