-- Allvisor initial schema + RLS
create extension if not exists "pgcrypto";

create type public.niche_type as enum ('clinic', 'retail');
create type public.membership_role as enum ('owner', 'admin', 'staff');
create type public.subscription_plan as enum ('free', 'starter', 'growth', 'pro');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');
create type public.invoice_status as enum ('draft', 'unpaid', 'partial', 'paid', 'void');
create type public.payment_method as enum ('cash', 'card', 'transfer', 'ewallet', 'other');
create type public.appointment_status as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.lhdn_status as enum ('not_submitted', 'pending', 'accepted', 'rejected', 'cancelled');
create type public.stock_movement_type as enum ('in', 'out', 'adjust', 'sale');
create type public.ledger_entry_type as enum ('income', 'expense');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  locale text default 'ms',
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche public.niche_type not null,
  locale_default text not null default 'ms',
  tin text,
  sst_number text,
  address text,
  phone text,
  subscription_plan public.subscription_plan not null default 'free',
  subscription_status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null default 'staff',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  sku text,
  description text,
  unit_price numeric(12,2) not null default 0,
  cost_price numeric(12,2) not null default 0,
  quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  type public.stock_movement_type not null,
  quantity integer not null,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  invoice_number text not null,
  status public.invoice_status not null default 'unpaid',
  issue_date date not null default current_date,
  due_date date,
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  notes text,
  lhdn_status public.lhdn_status not null default 'not_submitted',
  created_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric(12,2) not null,
  method public.payment_method not null default 'cash',
  paid_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  notes text,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category text not null,
  description text,
  amount numeric(12,2) not null,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entry_type public.ledger_entry_type not null,
  source text not null,
  source_id uuid,
  amount numeric(12,2) not null,
  entry_date date not null default current_date,
  description text,
  created_at timestamptz not null default now()
);

create table public.lhdn_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  status public.lhdn_status not null default 'pending',
  uuid text,
  payload jsonb,
  response jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create index memberships_user_id_idx on public.memberships (user_id);
create index customers_org_idx on public.customers (organization_id);
create index products_org_idx on public.products (organization_id);
create index invoices_org_idx on public.invoices (organization_id);
create index appointments_org_starts_idx on public.appointments (organization_id, starts_at);
create index expenses_org_idx on public.expenses (organization_id);
create index ledger_org_idx on public.ledger_entries (organization_id);

-- Helpers for RLS
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(org_id uuid, roles public.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.role = any (roles)
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'locale', 'ms')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments enable row level security;
alter table public.appointments enable row level security;
alter table public.expenses enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.lhdn_submissions enable row level security;

-- Profiles
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());

-- Organizations
create policy "orgs_select_member" on public.organizations for select using (public.is_org_member(id));
create policy "orgs_insert_authenticated" on public.organizations for insert with check (auth.uid() is not null);
create policy "orgs_update_admin" on public.organizations for update using (public.has_org_role(id, array['owner','admin']::public.membership_role[]));
create policy "orgs_delete_owner" on public.organizations for delete using (public.has_org_role(id, array['owner']::public.membership_role[]));

-- Memberships
create policy "memberships_select_member" on public.memberships for select using (public.is_org_member(organization_id) or user_id = auth.uid());
create policy "memberships_insert_admin" on public.memberships for insert with check (
  public.has_org_role(organization_id, array['owner','admin']::public.membership_role[])
  or not exists (select 1 from public.memberships m where m.organization_id = organization_id)
);
create policy "memberships_update_admin" on public.memberships for update using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));
create policy "memberships_delete_admin" on public.memberships for delete using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));

-- Generic org-scoped policies
create policy "customers_all" on public.customers for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "products_all" on public.products for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "stock_all" on public.stock_movements for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "invoices_all" on public.invoices for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "invoice_lines_all" on public.invoice_lines for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "payments_all" on public.payments for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "appointments_all" on public.appointments for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "expenses_all" on public.expenses for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "ledger_all" on public.ledger_entries for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "lhdn_all" on public.lhdn_submissions for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
