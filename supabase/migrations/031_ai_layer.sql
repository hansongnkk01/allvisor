-- AI layer: briefing cache, outbound notification channels, owner chat history.
-- Additive only. No existing table, policy, or flow is touched.
-- All four tables are owner/admin-only — briefing content and chat history may
-- reference staff performance, so supervisors and managers do not get access.

-- ── ai_briefings ────────────────────────────────────────────────────────────
-- Cached daily/weekly summaries so the dashboard never calls the LLM on load.

create table if not exists public.ai_briefings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  -- "daily" for now; a "weekly" variant can reuse the same table.
  kind text not null default 'daily'
    check (kind in ('daily', 'weekly')),
  -- Business day this briefing covers, in the org's local timezone.
  for_date date not null,
  locale text not null default 'ms',

  content text not null,
  -- Which engine produced it: the model name, or "rules" for the fallback.
  model text not null default 'rules',
  -- Snapshot of the structured input the text was generated from, for
  -- debugging and for re-rendering without re-querying.
  context jsonb not null default '{}'::jsonb,

  generated_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz not null default now(),

  unique (organization_id, kind, for_date)
);

create index if not exists ai_briefings_org_idx
  on public.ai_briefings (organization_id, kind, for_date desc);

alter table public.ai_briefings enable row level security;

drop policy if exists "ai_briefings_select_owner" on public.ai_briefings;
create policy "ai_briefings_select_owner"
  on public.ai_briefings
  for select
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.membership_role[]
    )
  );

-- Briefings are written by the cron / regenerate action through the service
-- role (bypasses RLS). An owner may still insert manually, e.g. from the
-- "Jana semula" button when no service key is configured.
drop policy if exists "ai_briefings_write_owner" on public.ai_briefings;
create policy "ai_briefings_write_owner"
  on public.ai_briefings
  for all
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.membership_role[]
    )
  )
  with check (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.membership_role[]
    )
  );

-- ── notification_channels ───────────────────────────────────────────────────
-- Telegram works end-to-end (Bot API). WhatsApp rows store the drafted message
-- for manual copy until an official integration exists.

create table if not exists public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,

  kind text not null
    check (kind in ('telegram', 'whatsapp')),
  -- telegram: "botToken:chatId"; whatsapp: phone number for display only.
  target text not null,
  enabled boolean not null default true,

  last_sent_at timestamptz,
  last_error text,

  created_at timestamptz not null default now(),

  unique (organization_id, kind)
);

alter table public.notification_channels enable row level security;

drop policy if exists "notification_channels_owner" on public.notification_channels;
create policy "notification_channels_owner"
  on public.notification_channels
  for all
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.membership_role[]
    )
  )
  with check (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.membership_role[]
    )
  );

-- ── ai_chat_sessions + ai_chat_messages ─────────────────────────────────────

create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  title text,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_sessions_org_idx
  on public.ai_chat_sessions (organization_id, user_id, created_at desc);

alter table public.ai_chat_sessions enable row level security;

drop policy if exists "ai_chat_sessions_owner" on public.ai_chat_sessions;
create policy "ai_chat_sessions_owner"
  on public.ai_chat_sessions
  for all
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.membership_role[]
    )
  )
  with check (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.membership_role[]
    )
  );

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_chat_sessions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  role text not null
    check (role in ('user', 'assistant')),
  content text not null,
  -- "rules" when the fallback answered instead of the model.
  model text not null default 'rules',
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_messages_session_idx
  on public.ai_chat_messages (session_id, created_at);

alter table public.ai_chat_messages enable row level security;

drop policy if exists "ai_chat_messages_owner" on public.ai_chat_messages;
create policy "ai_chat_messages_owner"
  on public.ai_chat_messages
  for all
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.membership_role[]
    )
  )
  with check (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.membership_role[]
    )
  );
