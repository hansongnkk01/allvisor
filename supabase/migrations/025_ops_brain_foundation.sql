-- 025_ops_brain_foundation.sql
-- AI Supervisor foundation: feature flag + alerts, scores, tasks,
-- briefings, notification channels, owner AI chat.
-- Additive only. Does not alter POS / invoices / payments / stock_movements.

-- ─── Feature flag on organizations ───────────────────────────────────────────
alter table public.organizations
  add column if not exists ops_brain_enabled boolean not null default false;

-- Optional thresholds / prefs (lead_time_days, refund_rate_pct, cash_variance_rm, etc.)
alter table public.organizations
  add column if not exists ops_brain_settings jsonb not null default '{}'::jsonb;

comment on column public.organizations.ops_brain_enabled is
  'When false, Ops Brain UI/rules/LLM/notify must no-op. Default off for safety.';
comment on column public.organizations.ops_brain_settings is
  'JSON config for Ops Brain thresholds and preferences per organization.';

-- ─── alerts ──────────────────────────────────────────────────────────────────
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type text not null,
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high')),
  title text not null,
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'investigating', 'resolved', 'auto_handled')),
  related_staff_id uuid references public.profiles (id) on delete set null,
  related_entity_type text,
  related_entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  auto_handled_at timestamptz,
  escalated_at timestamptz
);

create index if not exists alerts_org_status_created_idx
  on public.alerts (organization_id, status, created_at desc);

create index if not exists alerts_org_severity_created_idx
  on public.alerts (organization_id, severity, created_at desc);

create index if not exists alerts_org_staff_idx
  on public.alerts (organization_id, related_staff_id);

create index if not exists alerts_org_type_created_idx
  on public.alerts (organization_id, type, created_at desc);

alter table public.alerts enable row level security;

drop policy if exists "alerts_select" on public.alerts;
create policy "alerts_select" on public.alerts
  for select using (public.is_org_member(organization_id));

drop policy if exists "alerts_insert" on public.alerts;
create policy "alerts_insert" on public.alerts
  for insert with check (public.is_org_member(organization_id));

drop policy if exists "alerts_update" on public.alerts;
create policy "alerts_update" on public.alerts
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- Soft-delete not used; hard delete limited to owner/admin
drop policy if exists "alerts_delete" on public.alerts;
create policy "alerts_delete" on public.alerts
  for delete using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])
  );

-- ─── staff_scores ────────────────────────────────────────────────────────────
create table if not exists public.staff_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score_date date not null default (timezone('Asia/Kuala_Lumpur', now()))::date,
  sales_amount numeric(14, 2) not null default 0,
  transaction_count integer not null default 0,
  refund_count integer not null default 0,
  void_count integer not null default 0,
  refund_rate numeric(8, 4) not null default 0,
  void_rate numeric(8, 4) not null default 0,
  average_basket numeric(14, 2) not null default 0,
  hours_worked numeric(8, 2),
  score numeric(8, 2) not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, score_date)
);

create index if not exists staff_scores_org_date_idx
  on public.staff_scores (organization_id, score_date desc);

create index if not exists staff_scores_org_score_idx
  on public.staff_scores (organization_id, score_date desc, score desc);

alter table public.staff_scores enable row level security;

drop policy if exists "staff_scores_select" on public.staff_scores;
create policy "staff_scores_select" on public.staff_scores
  for select using (public.is_org_member(organization_id));

drop policy if exists "staff_scores_insert" on public.staff_scores;
create policy "staff_scores_insert" on public.staff_scores
  for insert with check (public.is_org_member(organization_id));

drop policy if exists "staff_scores_update" on public.staff_scores;
create policy "staff_scores_update" on public.staff_scores
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "staff_scores_delete" on public.staff_scores;
create policy "staff_scores_delete" on public.staff_scores
  for delete using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])
  );

-- ─── tasks (auto-assignment / safe auto-handle) ──────────────────────────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'done', 'cancelled')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  source text not null default 'manual'
    check (source in ('manual', 'rule', 'ai')),
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  related_alert_id uuid references public.alerts (id) on delete set null,
  related_entity_type text,
  related_entity_id uuid,
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_org_status_created_idx
  on public.tasks (organization_id, status, created_at desc);

create index if not exists tasks_org_assigned_idx
  on public.tasks (organization_id, assigned_to, status);

create index if not exists tasks_org_alert_idx
  on public.tasks (organization_id, related_alert_id);

alter table public.tasks enable row level security;

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (public.is_org_member(organization_id));

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (public.is_org_member(organization_id));

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])
  );

-- ─── ai_briefings (cached LLM / rule-based summaries) ────────────────────────
create table if not exists public.ai_briefings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_type text not null
    check (period_type in ('daily', 'weekly')),
  -- e.g. daily: 2026-08-07 ; weekly: 2026-W32
  period_key text not null,
  locale text not null default 'ms'
    check (locale in ('ms', 'en')),
  content text not null,
  source text not null default 'rule'
    check (source in ('rule', 'llm')),
  model text,
  input_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, period_type, period_key, locale)
);

create index if not exists ai_briefings_org_created_idx
  on public.ai_briefings (organization_id, created_at desc);

alter table public.ai_briefings enable row level security;

drop policy if exists "ai_briefings_select" on public.ai_briefings;
create policy "ai_briefings_select" on public.ai_briefings
  for select using (public.is_org_member(organization_id));

drop policy if exists "ai_briefings_insert" on public.ai_briefings;
create policy "ai_briefings_insert" on public.ai_briefings
  for insert with check (public.is_org_member(organization_id));

drop policy if exists "ai_briefings_update" on public.ai_briefings;
create policy "ai_briefings_update" on public.ai_briefings
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "ai_briefings_delete" on public.ai_briefings;
create policy "ai_briefings_delete" on public.ai_briefings
  for delete using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])
  );

-- ─── notification_channels (WhatsApp / Telegram / webhook) ───────────────────
create table if not exists public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  channel_type text not null
    check (channel_type in ('whatsapp', 'telegram', 'webhook')),
  label text,
  -- Webhook URL or bot endpoint; treat as secret in app layer
  endpoint_url text,
  -- Optional bot token / chat id / phone — store only what integration needs
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  notify_morning boolean not null default true,
  notify_evening boolean not null default true,
  notify_high_severity boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, channel_type)
);

create index if not exists notification_channels_org_idx
  on public.notification_channels (organization_id);

alter table public.notification_channels enable row level security;

-- Read: any org member (app should redact secrets in UI for staff)
drop policy if exists "notification_channels_select" on public.notification_channels;
create policy "notification_channels_select" on public.notification_channels
  for select using (public.is_org_member(organization_id));

-- Write: owner/admin only
drop policy if exists "notification_channels_insert" on public.notification_channels;
create policy "notification_channels_insert" on public.notification_channels
  for insert with check (
    public.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])
  );

drop policy if exists "notification_channels_update" on public.notification_channels;
create policy "notification_channels_update" on public.notification_channels
  for update
  using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])
  )
  with check (
    public.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])
  );

drop policy if exists "notification_channels_delete" on public.notification_channels;
create policy "notification_channels_delete" on public.notification_channels
  for delete using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])
  );

-- ─── ai_chat_sessions ────────────────────────────────────────────────────────
create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  title text,
  locale text not null default 'ms'
    check (locale in ('ms', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_chat_sessions_org_created_idx
  on public.ai_chat_sessions (organization_id, created_at desc);

alter table public.ai_chat_sessions enable row level security;

drop policy if exists "ai_chat_sessions_select" on public.ai_chat_sessions;
create policy "ai_chat_sessions_select" on public.ai_chat_sessions
  for select using (public.is_org_member(organization_id));

drop policy if exists "ai_chat_sessions_insert" on public.ai_chat_sessions;
create policy "ai_chat_sessions_insert" on public.ai_chat_sessions
  for insert with check (public.is_org_member(organization_id));

drop policy if exists "ai_chat_sessions_update" on public.ai_chat_sessions;
create policy "ai_chat_sessions_update" on public.ai_chat_sessions
  for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "ai_chat_sessions_delete" on public.ai_chat_sessions;
create policy "ai_chat_sessions_delete" on public.ai_chat_sessions
  for delete using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])
  );

-- ─── ai_chat_messages ────────────────────────────────────────────────────────
create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  session_id uuid not null references public.ai_chat_sessions (id) on delete cascade,
  role text not null
    check (role in ('user', 'assistant', 'system')),
  content text not null,
  -- Structured facts used for grounding (optional)
  context_snapshot jsonb not null default '{}'::jsonb,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_messages_session_created_idx
  on public.ai_chat_messages (session_id, created_at);

create index if not exists ai_chat_messages_org_created_idx
  on public.ai_chat_messages (organization_id, created_at desc);

alter table public.ai_chat_messages enable row level security;

drop policy if exists "ai_chat_messages_select" on public.ai_chat_messages;
create policy "ai_chat_messages_select" on public.ai_chat_messages
  for select using (public.is_org_member(organization_id));

drop policy if exists "ai_chat_messages_insert" on public.ai_chat_messages;
create policy "ai_chat_messages_insert" on public.ai_chat_messages
  for insert with check (public.is_org_member(organization_id));

-- Messages are append-only in app; allow admin cleanup only
drop policy if exists "ai_chat_messages_delete" on public.ai_chat_messages;
create policy "ai_chat_messages_delete" on public.ai_chat_messages
  for delete using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.membership_role[])
  );
