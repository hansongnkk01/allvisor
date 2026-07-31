export type Niche = "clinic" | "retail";

export type MembershipRole = "owner" | "admin" | "supervisor" | "manager" | "staff";

export type RiskLevel = "high" | "medium" | "low";

export type SubscriptionPlan = "free" | "starter" | "growth" | "pro";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export type InvoiceStatus = "draft" | "unpaid" | "partial" | "paid" | "void";
export type PaymentMethod = "cash" | "card" | "transfer" | "ewallet" | "other";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type LhdnStatus =
  | "not_submitted"
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";

export type StockMovementType = "in" | "out" | "adjust" | "sale";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  locale: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  niche: Niche;
  locale_default: string;
  tin: string | null;
  sst_number: string | null;
  /** Optional ROB/ROC for MyInvois intermediary onbehalfof (TIN:BRN). */
  lhdn_brn?: string | null;
  /** Shop confirmed Allvisor is authorized as intermediary in MyInvois. */
  lhdn_intermediary_linked?: boolean;
  lhdn_intermediary_linked_at?: string | null;
  address: string | null;
  phone: string | null;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  admin_password_hash?: string | null;
  clinic_open_hour?: number;
  clinic_close_hour?: number;
  closed_weekdays?: number[];
  service_charge_percent?: number;
  created_at: string;
}

export type InvoiceLineKind = "service" | "medicine" | "additional" | "service_charge";

export interface Membership {
  id: string;
  organization_id: string;
  user_id: string;
  role: MembershipRole;
  job_title: string | null;
  created_at: string;
  organizations?: Organization;
  profiles?: Profile;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  ic_number: string | null;
  address: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  risk_level: RiskLevel | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  organization_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unit_price: number;
  cost_price: number;
  quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
}

export interface StockMovement {
  id: string;
  organization_id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  customer_id: string | null;
  invoice_number: string;
  title: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  notes: string | null;
  medicine_description: string | null;
  medicine_amount: number;
  additional_description: string | null;
  additional_amount: number;
  lhdn_status: LhdnStatus;
  created_at: string;
  customers?: Customer | null;
}

export interface BranchLinkRequest {
  id: string;
  from_organization_id: string;
  to_organization_id: string;
  requested_by: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  from_org?: Organization | null;
  to_org?: Organization | null;
}

export interface BranchLink {
  id: string;
  organization_id: string;
  linked_organization_id: string;
  created_at: string;
  linked_org?: Organization | null;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  organization_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  price_list_item_id?: string | null;
  line_kind?: InvoiceLineKind;
}

export interface ServiceCategory {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ServiceItem {
  id: string;
  organization_id: string;
  name: string;
  category: string;
  category_id: string | null;
  unit_price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  service_categories?: ServiceCategory | null;
}

export interface PriceListItem {
  id: string;
  organization_id: string;
  service_item_id: string | null;
  name: string;
  unit_price: number;
  is_active: boolean;
  created_at: string;
  service_items?: ServiceItem | null;
}

export interface InvoiceStatusLog {
  id: string;
  organization_id: string;
  invoice_id: string;
  from_status: InvoiceStatus | null;
  to_status: InvoiceStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
  profiles?: Profile | null;
}

export interface Payment {
  id: string;
  organization_id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  note: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  organization_id: string;
  customer_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  reminder_sent: boolean;
  created_at: string;
  customers?: Customer | null;
}

export interface Expense {
  id: string;
  organization_id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  organization_id: string;
  entry_type: "income" | "expense";
  source: string;
  source_id: string | null;
  amount: number;
  entry_date: string;
  description: string | null;
  created_at: string;
}

export interface LhdnSubmission {
  id: string;
  organization_id: string;
  invoice_id: string;
  status: LhdnStatus;
  uuid: string | null;
  payload: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  submitted_at: string | null;
  created_at: string;
}

export interface OrgContext {
  organization: Organization;
  membership: Membership;
  profile: Profile;
}
