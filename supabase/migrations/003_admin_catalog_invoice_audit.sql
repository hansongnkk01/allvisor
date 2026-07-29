-- Catalog, price list, invoice title, status audit

create table if not exists public.service_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  category text not null default 'General',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_item_id uuid references public.service_items (id) on delete set null,
  name text not null,
  unit_price numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_status_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  from_status public.invoice_status,
  to_status public.invoice_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.invoices
  add column if not exists title text;

alter table public.invoice_lines
  add column if not exists price_list_item_id uuid references public.price_list_items (id) on delete set null;

create index if not exists service_items_org_idx on public.service_items (organization_id);
create index if not exists price_list_items_org_idx on public.price_list_items (organization_id);
create index if not exists invoice_status_logs_invoice_idx on public.invoice_status_logs (invoice_id, created_at desc);

alter table public.service_items enable row level security;
alter table public.price_list_items enable row level security;
alter table public.invoice_status_logs enable row level security;

drop policy if exists "service_items_all" on public.service_items;
create policy "service_items_all" on public.service_items
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "price_list_items_all" on public.price_list_items;
create policy "price_list_items_all" on public.price_list_items
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "invoice_status_logs_all" on public.invoice_status_logs;
create policy "invoice_status_logs_all" on public.invoice_status_logs
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
