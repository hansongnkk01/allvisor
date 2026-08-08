-- Gym memberships got the name `public.memberships` in 020_multi_niche, but
-- that name was already taken by the core organisation-membership table from
-- 001. `create table if not exists` silently no-opped, so the gym table never
-- existed and every gym membership query/insert has been erroring. The gym
-- table gets its own name here; 020 is also corrected for fresh installs.

create table if not exists public.gym_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  plan_name text not null,
  starts_on date not null default current_date,
  ends_on date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists gym_memberships_org_idx
  on public.gym_memberships (organization_id, status, ends_on);

alter table public.gym_memberships enable row level security;

drop policy if exists "gym_memberships_all" on public.gym_memberships;
create policy "gym_memberships_all"
  on public.gym_memberships
  for all
  to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
