-- IC, activity logs, admin password, richer accounting

alter table public.customers
  add column if not exists ic_number text;

alter table public.organizations
  add column if not exists admin_password_hash text;

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text,
  action text not null,
  entity_type text,
  entity_id uuid,
  summary text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_org_created_idx
  on public.activity_logs (organization_id, created_at desc);

alter table public.activity_logs enable row level security;

drop policy if exists "activity_logs_select" on public.activity_logs;
create policy "activity_logs_select" on public.activity_logs
  for select using (public.is_org_member(organization_id));

drop policy if exists "activity_logs_insert" on public.activity_logs;
create policy "activity_logs_insert" on public.activity_logs
  for insert with check (public.is_org_member(organization_id));

-- Soften unique invoice number so status snapshots can share naming pattern
alter table public.invoices drop constraint if exists invoices_organization_id_invoice_number_key;
create unique index if not exists invoices_org_number_unique
  on public.invoices (organization_id, invoice_number);

-- Allow multiple rows with same title; numbers stay unique via suffix on snapshot

-- Manual cash-in for clinic accounting (income without invoice)
-- ledger_entries already supports entry_type income/expense
