-- Gym memberships got the name `public.memberships` in 020_multi_niche, but
-- that name was already taken by the core organisation-membership table from
-- 001. `create table if not exists` silently no-opped, so the gym table never
-- existed and every gym membership query/insert has been erroring. The gym
-- table gets its own name here; 020 is also corrected for fresh installs.
--
-- v2 (bulletproof): the live database already has SOMETHING named
-- `gym_memberships` (an old draft object), which made the plain
-- `create table if not exists` fail with 42P07. Inspect first:
--   - a real table  -> keep it, patch any missing columns one by one
--   - anything else -> drop it (the feature never worked, so it holds no data)

do $$
declare
  existing_kind "char";
begin
  select c.relkind into existing_kind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'gym_memberships';

  if existing_kind is not null and existing_kind not in ('r', 'p') then
    if existing_kind = 'v' then
      drop view public.gym_memberships cascade;
    elsif existing_kind = 'm' then
      drop materialized view public.gym_memberships cascade;
    elsif existing_kind = 'S' then
      drop sequence public.gym_memberships cascade;
    elsif existing_kind = 'f' then
      drop foreign table public.gym_memberships cascade;
    end if;
  end if;
end $$;

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

-- Patch an older draft table column-by-column (all no-ops on a fresh table).
alter table public.gym_memberships add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
alter table public.gym_memberships add column if not exists customer_id uuid references public.customers (id) on delete cascade;
alter table public.gym_memberships add column if not exists plan_name text;
alter table public.gym_memberships add column if not exists starts_on date default current_date;
alter table public.gym_memberships add column if not exists ends_on date;
alter table public.gym_memberships add column if not exists status text default 'active';
alter table public.gym_memberships add column if not exists created_at timestamptz default now();

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

-- Confirmation: the SQL editor shows the final column list when this succeeds.
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'gym_memberships'
 order by ordinal_position;
