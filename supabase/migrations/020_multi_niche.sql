-- Expand niche_type enum for multi-niche Allvisor (additive only).
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'salon'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'pharmacy'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'optical'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'tuition'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'workshop'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'gym'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'vet'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'fashion'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'electronics'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'wholesale'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'laundry'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'physio'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'lab'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'fnb'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'hotel'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'property'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'courier'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'contractor'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'manufacturing'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'legal'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'events'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.niche_type ADD VALUE 'farm'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Salon ───────────────────────────────────────────────────────────────────
create table if not exists public.salon_commission_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  staff_user_id uuid references public.profiles (id) on delete set null,
  staff_name text not null,
  percent numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);
alter table public.salon_commission_rules enable row level security;
drop policy if exists "salon_commission_rules_all" on public.salon_commission_rules;
create policy "salon_commission_rules_all" on public.salon_commission_rules
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- ─── Pharmacy batches ────────────────────────────────────────────────────────
create table if not exists public.product_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  lot_number text not null,
  expiry_date date,
  quantity numeric(14,3) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_batches_org_product_idx on public.product_batches (organization_id, product_id);
alter table public.product_batches enable row level security;
drop policy if exists "product_batches_all" on public.product_batches;
create policy "product_batches_all" on public.product_batches
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

alter table public.products add column if not exists controlled_item boolean not null default false;

-- ─── Optical ─────────────────────────────────────────────────────────────────
create table if not exists public.eye_prescriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  od_sph text, od_cyl text, od_axis text,
  os_sph text, os_cyl text, os_axis text,
  pd text, notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.optical_lab_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  prescription_id uuid references public.eye_prescriptions (id) on delete set null,
  frame_name text,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);
alter table public.eye_prescriptions enable row level security;
alter table public.optical_lab_orders enable row level security;
drop policy if exists "eye_prescriptions_all" on public.eye_prescriptions;
create policy "eye_prescriptions_all" on public.eye_prescriptions
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "optical_lab_orders_all" on public.optical_lab_orders;
create policy "optical_lab_orders_all" on public.optical_lab_orders
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- ─── Tuition ─────────────────────────────────────────────────────────────────
create table if not exists public.tuition_classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  schedule text,
  fee numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.tuition_attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  class_id uuid not null references public.tuition_classes (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  attended_on date not null default current_date,
  present boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.tuition_classes enable row level security;
alter table public.tuition_attendance enable row level security;
drop policy if exists "tuition_classes_all" on public.tuition_classes;
create policy "tuition_classes_all" on public.tuition_classes
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "tuition_attendance_all" on public.tuition_attendance;
create policy "tuition_attendance_all" on public.tuition_attendance
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- ─── Workshop ────────────────────────────────────────────────────────────────
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  plate text not null,
  make text, model text, year text,
  created_at timestamptz not null default now()
);
create table if not exists public.job_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  title text not null,
  status text not null default 'intake',
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.job_card_lines (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_cards (id) on delete cascade,
  kind text not null default 'labour',
  description text not null,
  amount numeric(12,2) not null default 0
);
alter table public.vehicles enable row level security;
alter table public.job_cards enable row level security;
alter table public.job_card_lines enable row level security;
drop policy if exists "vehicles_all" on public.vehicles;
create policy "vehicles_all" on public.vehicles
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "job_cards_all" on public.job_cards;
create policy "job_cards_all" on public.job_cards
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "job_card_lines_all" on public.job_card_lines;
create policy "job_card_lines_all" on public.job_card_lines
  for all using (exists (select 1 from public.job_cards j where j.id = job_id and public.is_org_member(j.organization_id)))
  with check (exists (select 1 from public.job_cards j where j.id = job_id and public.is_org_member(j.organization_id)));

-- ─── Gym ─────────────────────────────────────────────────────────────────────
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  plan_name text not null,
  starts_on date not null default current_date,
  ends_on date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create table if not exists public.gym_checkins (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  checked_in_at timestamptz not null default now()
);
alter table public.memberships enable row level security;
alter table public.gym_checkins enable row level security;
drop policy if exists "memberships_all" on public.memberships;
create policy "memberships_all" on public.memberships
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "gym_checkins_all" on public.gym_checkins;
create policy "gym_checkins_all" on public.gym_checkins
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- ─── Vet ─────────────────────────────────────────────────────────────────────
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  species text, breed text, notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.pet_vaccinations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  vaccine_name text not null,
  given_on date, due_on date,
  created_at timestamptz not null default now()
);
alter table public.pets enable row level security;
alter table public.pet_vaccinations enable row level security;
drop policy if exists "pets_all" on public.pets;
create policy "pets_all" on public.pets
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "pet_vaccinations_all" on public.pet_vaccinations;
create policy "pet_vaccinations_all" on public.pet_vaccinations
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- ─── Fashion variants / electronics serial / wholesale tiers ─────────────────
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  size text, color text, sku text, barcode text,
  quantity numeric(14,3) not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.product_serials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  serial_number text not null,
  status text not null default 'in_stock',
  created_at timestamptz not null default now()
);
create table if not exists public.price_tiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  discount_percent numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);
alter table public.product_variants enable row level security;
alter table public.product_serials enable row level security;
alter table public.price_tiers enable row level security;
drop policy if exists "product_variants_all" on public.product_variants;
create policy "product_variants_all" on public.product_variants
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "product_serials_all" on public.product_serials;
create policy "product_serials_all" on public.product_serials
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "price_tiers_all" on public.price_tiers;
create policy "price_tiers_all" on public.price_tiers
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- ─── Laundry / physio / lab ──────────────────────────────────────────────────
create table if not exists public.laundry_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  ticket_number text not null,
  status text not null default 'received',
  item_count integer not null default 1,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.session_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  total_sessions integer not null default 10,
  used_sessions integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  test_name text not null,
  status text not null default 'pending',
  result_summary text,
  created_at timestamptz not null default now()
);
alter table public.laundry_tickets enable row level security;
alter table public.session_packages enable row level security;
alter table public.lab_results enable row level security;
drop policy if exists "laundry_tickets_all" on public.laundry_tickets;
create policy "laundry_tickets_all" on public.laundry_tickets
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "session_packages_all" on public.session_packages;
create policy "session_packages_all" on public.session_packages
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "lab_results_all" on public.lab_results;
create policy "lab_results_all" on public.lab_results
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- ─── F&B / Hotel ─────────────────────────────────────────────────────────────
create table if not exists public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  seats integer not null default 4,
  status text not null default 'free',
  created_at timestamptz not null default now()
);
create table if not exists public.hotel_rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  room_number text not null,
  room_type text not null default 'standard',
  status text not null default 'vacant',
  rate numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
alter table public.dining_tables enable row level security;
alter table public.hotel_rooms enable row level security;
drop policy if exists "dining_tables_all" on public.dining_tables;
create policy "dining_tables_all" on public.dining_tables
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "hotel_rooms_all" on public.hotel_rooms;
create policy "hotel_rooms_all" on public.hotel_rooms
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- ─── Specialty stubs ─────────────────────────────────────────────────────────
create table if not exists public.property_listings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null, status text not null default 'available', notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.courier_shipments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  tracking_no text not null, status text not null default 'created', notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.contractor_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null, status text not null default 'active', claim_amount numeric(12,2) default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.manufacturing_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null, status text not null default 'planned', notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.legal_matters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null, status text not null default 'open', notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.event_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null, event_date date, status text not null default 'planning',
  created_at timestamptz not null default now()
);
create table if not exists public.farm_plots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null, crop text, status text not null default 'idle',
  created_at timestamptz not null default now()
);

alter table public.property_listings enable row level security;
alter table public.courier_shipments enable row level security;
alter table public.contractor_projects enable row level security;
alter table public.manufacturing_orders enable row level security;
alter table public.legal_matters enable row level security;
alter table public.event_plans enable row level security;
alter table public.farm_plots enable row level security;

drop policy if exists "property_listings_all" on public.property_listings;
create policy "property_listings_all" on public.property_listings for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "courier_shipments_all" on public.courier_shipments;
create policy "courier_shipments_all" on public.courier_shipments for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "contractor_projects_all" on public.contractor_projects;
create policy "contractor_projects_all" on public.contractor_projects for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "manufacturing_orders_all" on public.manufacturing_orders;
create policy "manufacturing_orders_all" on public.manufacturing_orders for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "legal_matters_all" on public.legal_matters;
create policy "legal_matters_all" on public.legal_matters for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "event_plans_all" on public.event_plans;
create policy "event_plans_all" on public.event_plans for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
drop policy if exists "farm_plots_all" on public.farm_plots;
create policy "farm_plots_all" on public.farm_plots for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
