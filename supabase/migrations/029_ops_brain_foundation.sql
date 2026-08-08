-- Ops Brain foundation: alerts + tasks + per-org feature flag.
-- Additive only. No existing table, policy, or flow is touched.

-- Per-organisation kill switch. Default on so existing shops see the new cards
-- as soon as they have data; an owner can switch it off in /admin.
alter table public.organizations
  add column if not exists ops_brain_enabled boolean not null default true;

-- ── alerts ──────────────────────────────────────────────────────────────────

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  -- Machine-readable kind, e.g. "refund_rate", "cash_variance", "stock_leak".
  type text not null,
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high')),
  title text not null,
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'investigating', 'resolved')),

  related_staff_id uuid references auth.users(id) on delete set null,
  related_entity_type text,
  related_entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index if not exists alerts_org_status_idx
  on public.alerts (organization_id, status, created_at desc);
create index if not exists alerts_org_staff_idx
  on public.alerts (organization_id, related_staff_id, created_at desc)
  where related_staff_id is not null;

alter table public.alerts enable row level security;

-- Every member sees the alert list; that is what lets a supervisor work the
-- queue. Staff-identifying detail is trimmed in the UI for plain staff roles.
drop policy if exists "alerts_select_member" on public.alerts;
create policy "alerts_select_member"
  on public.alerts
  for select
  to authenticated
  using (public.is_org_member(organization_id));

-- Only leadership creates or changes alerts by hand. The rule engine writes
-- through the service role, which bypasses RLS entirely.
drop policy if exists "alerts_write_leadership" on public.alerts;
create policy "alerts_write_leadership"
  on public.alerts
  for all
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin','supervisor','manager']::public.membership_role[]
    )
  )
  with check (
    public.has_org_role(
      organization_id,
      array['owner','admin','supervisor','manager']::public.membership_role[]
    )
  );

-- ── tasks ───────────────────────────────────────────────────────────────────

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  title text not null,
  notes text,
  status text not null default 'open'
    check (status in ('open', 'done')),

  assigned_to uuid references auth.users(id) on delete set null,
  -- manual = a human created it; alert = raised from an alert; ai = the
  -- briefing engine suggested it.
  source text not null default 'manual'
    check (source in ('manual', 'alert', 'ai')),
  alert_id uuid references public.alerts(id) on delete set null,
  due_date date,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create index if not exists tasks_org_status_idx
  on public.tasks (organization_id, status, created_at desc);
create index if not exists tasks_assignee_idx
  on public.tasks (organization_id, assigned_to, status)
  where assigned_to is not null;

alter table public.tasks enable row level security;

drop policy if exists "tasks_select_member" on public.tasks;
create policy "tasks_select_member"
  on public.tasks
  for select
  to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "tasks_insert_leadership" on public.tasks;
create policy "tasks_insert_leadership"
  on public.tasks
  for insert
  to authenticated
  with check (
    public.has_org_role(
      organization_id,
      array['owner','admin','supervisor','manager']::public.membership_role[]
    )
  );

-- The assignee may flip their own task done/open; leadership may edit anything.
drop policy if exists "tasks_update_member" on public.tasks;
create policy "tasks_update_member"
  on public.tasks
  for update
  to authenticated
  using (
    assigned_to = auth.uid()
    or public.has_org_role(
      organization_id,
      array['owner','admin','supervisor','manager']::public.membership_role[]
    )
  )
  with check (
    assigned_to = auth.uid()
    or public.has_org_role(
      organization_id,
      array['owner','admin','supervisor','manager']::public.membership_role[]
    )
  );

drop policy if exists "tasks_delete_leadership" on public.tasks;
create policy "tasks_delete_leadership"
  on public.tasks
  for delete
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin','supervisor','manager']::public.membership_role[]
    )
  );
