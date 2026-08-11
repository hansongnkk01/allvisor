-- Floor primitives + niche workflow upgrades (status boards, money glue, compliance)

-- ─── Invoice source link + deposit flag ──────────────────────────────────────
alter table public.invoices
  add column if not exists source_type text,
  add column if not exists source_entity_id uuid,
  add column if not exists is_deposit boolean not null default false,
  add column if not exists deposit_of_invoice_id uuid references public.invoices (id) on delete set null;

create index if not exists invoices_source_entity_idx
  on public.invoices (organization_id, source_type, source_entity_id);

-- ─── POS discount / void audit ───────────────────────────────────────────────
alter table public.pos_tickets
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists discount_reason text,
  add column if not exists void_reason text;

alter table public.invoices
  add column if not exists discount_amount numeric(12,2) not null default 0,
  add column if not exists discount_reason text;

-- ─── Job cards (workshop) ────────────────────────────────────────────────────
alter table public.job_cards
  add column if not exists assigned_to text,
  add column if not exists labour_amount numeric(12,2) not null default 0,
  add column if not exists parts_amount numeric(12,2) not null default 0,
  add column if not exists promised_at timestamptz,
  add column if not exists status_changed_at timestamptz default now(),
  add column if not exists invoice_id uuid references public.invoices (id) on delete set null;

alter table public.job_card_lines
  add column if not exists product_id uuid references public.products (id) on delete set null,
  add column if not exists quantity numeric(14,3) not null default 1;

-- ─── Laundry ─────────────────────────────────────────────────────────────────
alter table public.laundry_tickets
  add column if not exists express boolean not null default false,
  add column if not exists special_instructions text,
  add column if not exists ready_at timestamptz,
  add column if not exists collected_at timestamptz,
  add column if not exists amount numeric(12,2) not null default 0,
  add column if not exists invoice_id uuid references public.invoices (id) on delete set null,
  add column if not exists status_changed_at timestamptz default now();

-- ─── Courier ─────────────────────────────────────────────────────────────────
alter table public.courier_shipments
  add column if not exists sender_name text,
  add column if not exists receiver_name text,
  add column if not exists receiver_phone text,
  add column if not exists pickup_address text,
  add column if not exists delivery_address text,
  add column if not exists service_type text default 'standard',
  add column if not exists weight_kg numeric(10,3),
  add column if not exists cod_amount numeric(12,2) not null default 0,
  add column if not exists cod_collected boolean not null default false,
  add column if not exists rider_name text,
  add column if not exists pod_note text,
  add column if not exists failed_reason text,
  add column if not exists delivered_at timestamptz,
  add column if not exists customer_id uuid references public.customers (id) on delete set null,
  add column if not exists amount numeric(12,2) not null default 0,
  add column if not exists invoice_id uuid references public.invoices (id) on delete set null,
  add column if not exists status_changed_at timestamptz default now();

-- ─── Electronics serials ─────────────────────────────────────────────────────
alter table public.product_serials
  add column if not exists customer_id uuid references public.customers (id) on delete set null,
  add column if not exists sold_at timestamptz,
  add column if not exists warranty_months integer not null default 12,
  add column if not exists warranty_ends_on date,
  add column if not exists invoice_id uuid references public.invoices (id) on delete set null,
  add column if not exists notes text,
  add column if not exists status_changed_at timestamptz default now();

-- ─── Pharmacy batches + controlled register ──────────────────────────────────
alter table public.product_batches
  add column if not exists cost_per_unit numeric(12,4) default 0,
  add column if not exists quarantined boolean not null default false;

create table if not exists public.controlled_drug_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  batch_id uuid references public.product_batches (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  quantity numeric(14,3) not null default 1,
  rx_reference text,
  staff_name text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.controlled_drug_logs enable row level security;
drop policy if exists "controlled_drug_logs_all" on public.controlled_drug_logs;
create policy "controlled_drug_logs_all" on public.controlled_drug_logs
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create table if not exists public.prescription_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  reference_no text,
  notes text,
  dispensed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.prescription_attachments enable row level security;
drop policy if exists "prescription_attachments_all" on public.prescription_attachments;
create policy "prescription_attachments_all" on public.prescription_attachments
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ─── Optical lab pipeline ────────────────────────────────────────────────────
alter table public.optical_lab_orders
  add column if not exists lab_name text,
  add column if not exists lens_type text,
  add column if not exists coating text,
  add column if not exists lab_cost numeric(12,2) not null default 0,
  add column if not exists sell_price numeric(12,2) not null default 0,
  add column if not exists expected_ready_on date,
  add column if not exists ready_at timestamptz,
  add column if not exists collected_at timestamptz,
  add column if not exists invoice_id uuid references public.invoices (id) on delete set null,
  add column if not exists status_changed_at timestamptz default now();

alter table public.eye_prescriptions
  add column if not exists appointment_id uuid references public.appointments (id) on delete set null,
  add column if not exists expires_on date;

-- ─── Physio / salon session packages ─────────────────────────────────────────
alter table public.session_packages
  add column if not exists expires_on date,
  add column if not exists status text not null default 'active',
  add column if not exists price_paid numeric(12,2) not null default 0,
  add column if not exists last_used_at timestamptz;

create table if not exists public.session_package_uses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  package_id uuid not null references public.session_packages (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  used_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.session_package_uses enable row level security;
drop policy if exists "session_package_uses_all" on public.session_package_uses;
create policy "session_package_uses_all" on public.session_package_uses
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

alter table public.salon_commission_rules
  add column if not exists rule_type text not null default 'service',
  add column if not exists service_name text;

create table if not exists public.salon_commission_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  staff_name text not null,
  amount numeric(12,2) not null default 0,
  source_type text,
  source_id uuid,
  note text,
  earned_on date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.salon_commission_entries enable row level security;
drop policy if exists "salon_commission_entries_all" on public.salon_commission_entries;
create policy "salon_commission_entries_all" on public.salon_commission_entries
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ─── Clinic queue / notes / MC ───────────────────────────────────────────────
alter table public.appointments
  add column if not exists queue_status text,
  add column if not exists checked_in_at timestamptz,
  add column if not exists room_name text,
  add column if not exists assigned_staff text,
  add column if not exists clinical_notes text,
  add column if not exists waiting_started_at timestamptz;

create table if not exists public.medical_letters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  letter_type text not null default 'mc',
  days_off integer,
  body text not null,
  issued_on date not null default current_date,
  created_by_name text,
  created_at timestamptz not null default now()
);
alter table public.medical_letters enable row level security;
drop policy if exists "medical_letters_all" on public.medical_letters;
create policy "medical_letters_all" on public.medical_letters
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ─── Lab results TAT ─────────────────────────────────────────────────────────
alter table public.lab_results
  add column if not exists sample_collected_at timestamptz,
  add column if not exists collected_by text,
  add column if not exists result_value text,
  add column if not exists result_unit text,
  add column if not exists reference_range text,
  add column if not exists abnormal boolean not null default false,
  add column if not exists ready_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists appointment_id uuid references public.appointments (id) on delete set null,
  add column if not exists amount numeric(12,2) not null default 0,
  add column if not exists invoice_id uuid references public.invoices (id) on delete set null,
  add column if not exists status_changed_at timestamptz default now();

-- ─── Gym memberships + PT ────────────────────────────────────────────────────
alter table public.gym_memberships
  add column if not exists freeze_reason text,
  add column if not exists frozen_until date,
  add column if not exists price_paid numeric(12,2) not null default 0,
  add column if not exists invoice_id uuid references public.invoices (id) on delete set null;

create table if not exists public.gym_pt_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  trainer_name text,
  package_name text not null default 'PT package',
  total_sessions integer not null default 10,
  used_sessions integer not null default 0,
  status text not null default 'active',
  expires_on date,
  created_at timestamptz not null default now()
);
alter table public.gym_pt_sessions enable row level security;
drop policy if exists "gym_pt_sessions_all" on public.gym_pt_sessions;
create policy "gym_pt_sessions_all" on public.gym_pt_sessions
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ─── Tuition term fees ───────────────────────────────────────────────────────
create table if not exists public.tuition_term_fees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  term_name text not null,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  status text not null default 'outstanding',
  due_on date,
  invoice_id uuid references public.invoices (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.tuition_term_fees enable row level security;
drop policy if exists "tuition_term_fees_all" on public.tuition_term_fees;
create policy "tuition_term_fees_all" on public.tuition_term_fees
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

alter table public.tuition_classes
  add column if not exists capacity integer not null default 20,
  add column if not exists teacher_name text;

-- ─── Pet vaccinations enrich ─────────────────────────────────────────────────
alter table public.pet_vaccinations
  add column if not exists batch_lot text,
  add column if not exists notes text;

-- ─── Hotel resthouse MVP ─────────────────────────────────────────────────────
alter table public.hotel_rooms
  add column if not exists current_guest_id uuid references public.customers (id) on delete set null,
  add column if not exists current_guest_name text,
  add column if not exists check_in_at timestamptz,
  add column if not exists check_out_on date,
  add column if not exists folio_balance numeric(12,2) not null default 0,
  add column if not exists invoice_id uuid references public.invoices (id) on delete set null,
  add column if not exists status_changed_at timestamptz default now();

create table if not exists public.hotel_stays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  room_id uuid not null references public.hotel_rooms (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  guest_name text not null,
  arrival_on date not null,
  departure_on date not null,
  status text not null default 'reserved',
  rate numeric(12,2) not null default 0,
  deposit_amount numeric(12,2) not null default 0,
  notes text,
  invoice_id uuid references public.invoices (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.hotel_stays enable row level security;
drop policy if exists "hotel_stays_all" on public.hotel_stays;
create policy "hotel_stays_all" on public.hotel_stays
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ─── Wholesale customer tier + MOQ ───────────────────────────────────────────
alter table public.customers
  add column if not exists price_tier_id uuid references public.price_tiers (id) on delete set null,
  add column if not exists credit_limit numeric(12,2);

alter table public.products
  add column if not exists moq numeric(14,3) default 1,
  add column if not exists pack_size numeric(14,3) default 1,
  add column if not exists serialised boolean not null default false;

-- ─── F&B table ticket link (light) ───────────────────────────────────────────
alter table public.dining_tables
  add column if not exists covers integer not null default 0,
  add column if not exists current_ticket_id uuid,
  add column if not exists status_changed_at timestamptz default now();
