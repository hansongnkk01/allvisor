-- Gym walk-in sessions: a customer pays at the counter (e.g. RM1 = 1 hour)
-- and the dashboard pops a notification when their paid time runs out.
-- Staff/admin acknowledge the popup; the row doubles as the payment record
-- (a matching income row is also written to ledger_entries by the action).

create table if not exists public.gym_walkin_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_name text not null,
  amount numeric(10,2) not null default 0,
  minutes integer not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'active', -- active | expired | done
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists gym_walkin_sessions_org_idx
  on public.gym_walkin_sessions (organization_id, status, expires_at);

alter table public.gym_walkin_sessions enable row level security;

drop policy if exists "gym_walkin_sessions_all" on public.gym_walkin_sessions;
create policy "gym_walkin_sessions_all"
  on public.gym_walkin_sessions
  for all
  to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
