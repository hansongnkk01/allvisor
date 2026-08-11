-- Gym walk-in packages: the admin defines the bundles (name, minutes, price)
-- and counter staff just pick one — no manual amount/rate entry. Walk-in
-- sessions also capture IC number and address now.

create table if not exists public.gym_walkin_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  minutes integer not null,
  price numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists gym_walkin_packages_org_idx
  on public.gym_walkin_packages (organization_id, is_active);

alter table public.gym_walkin_packages enable row level security;

drop policy if exists "gym_walkin_packages_all" on public.gym_walkin_packages;
create policy "gym_walkin_packages_all"
  on public.gym_walkin_packages
  for all
  to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

alter table public.gym_walkin_sessions add column if not exists ic_number text;
alter table public.gym_walkin_sessions add column if not exists address text;
alter table public.gym_walkin_sessions add column if not exists package_id uuid references public.gym_walkin_packages (id) on delete set null;
alter table public.gym_walkin_sessions add column if not exists package_name text;
