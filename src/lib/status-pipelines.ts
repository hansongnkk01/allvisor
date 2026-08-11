/**
 * Shared status pipelines for floor boards.
 * Keep labels short — staff glance, not owner analytics.
 */

export type PipelineStatus = {
  value: string;
  label: string;
};

export const JOB_STATUSES: PipelineStatus[] = [
  { value: "intake", label: "Intake" },
  { value: "diagnosis", label: "Diagnosis" },
  { value: "waiting_parts", label: "Waiting parts" },
  { value: "in_progress", label: "In progress" },
  { value: "qc", label: "QC" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
];

export const LAUNDRY_STATUSES: PipelineStatus[] = [
  { value: "received", label: "Received" },
  { value: "washing", label: "Washing" },
  { value: "ready", label: "Ready" },
  { value: "collected", label: "Collected" },
];

export const SHIPMENT_STATUSES: PipelineStatus[] = [
  { value: "created", label: "Created" },
  { value: "picked_up", label: "Picked up" },
  { value: "in_transit", label: "In transit" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
  { value: "returned", label: "Returned" },
];

export const SERIAL_STATUSES: PipelineStatus[] = [
  { value: "in_stock", label: "In stock" },
  { value: "sold", label: "Sold" },
  { value: "returned", label: "Returned" },
  { value: "defective", label: "Defective" },
  { value: "written_off", label: "Written off" },
];

export const LAB_ORDER_STATUSES: PipelineStatus[] = [
  { value: "pending", label: "Ordered" },
  { value: "in_lab", label: "In lab" },
  { value: "ready", label: "Ready" },
  { value: "collected", label: "Collected" },
];

export const LAB_RESULT_STATUSES: PipelineStatus[] = [
  { value: "pending", label: "Ordered" },
  { value: "collected", label: "Sample collected" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready" },
  { value: "delivered", label: "Delivered" },
];

export const QUEUE_STATUSES: PipelineStatus[] = [
  { value: "waiting", label: "Waiting" },
  { value: "called", label: "Called" },
  { value: "in_room", label: "In room" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-show" },
];

export const ROOM_STATUSES: PipelineStatus[] = [
  { value: "vacant", label: "Vacant clean" },
  { value: "dirty", label: "Vacant dirty" },
  { value: "occupied", label: "Occupied" },
  { value: "reserved", label: "Reserved" },
  { value: "ooo", label: "Out of order" },
];

export const TABLE_STATUSES: PipelineStatus[] = [
  { value: "free", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "bill", label: "Bill printed" },
  { value: "dirty", label: "Dirty" },
];

export const MEMBERSHIP_STATUSES: PipelineStatus[] = [
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring soon" },
  { value: "frozen", label: "Frozen" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export const DISCOUNT_REASONS = [
  "Manager approval",
  "Damaged / near-expiry",
  "Loyalty / regular",
  "Promo / clearance",
  "Price match",
  "Error correction",
  "Other",
] as const;

export const VOID_REASONS = [
  "Customer cancelled",
  "Wrong items",
  "Duplicate ticket",
  "Payment failed",
  "Other",
] as const;
