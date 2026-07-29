-- Categories + services with price (replaces free-text category / separate price list UX)

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists service_categories_org_idx
  on public.service_categories (organization_id);

alter table public.service_categories enable row level security;

drop policy if exists "service_categories_all" on public.service_categories;
create policy "service_categories_all" on public.service_categories
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- Ensure service_items has category_id + unit_price
alter table public.service_items
  add column if not exists category_id uuid references public.service_categories (id) on delete set null;

alter table public.service_items
  add column if not exists unit_price numeric(12,2) not null default 0;

-- Keep legacy text category column if present (optional display fallback)
-- New UI uses category_id only.
