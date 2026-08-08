-- Reconcile Ops Brain tables with an older draft that was applied to the live
-- database before the final column names settled. Idempotent: safe to run on
-- both the old live schema and a fresh database.
--
-- Live-old → code-expected:
--   tasks:                 description → notes, related_alert_id → alert_id,
--                          completed_at → done_at
--   staff_scores:          + activity_count, + computed_at
--   ai_briefings:          period_type → kind, period_key → for_date,
--                          input_snapshot → context, + generated_by,
--                          + generated_at
--   notification_channels: channel_type → kind, endpoint_url/config → target,
--                          + last_sent_at, + last_error
--   ai_chat_sessions:      created_by → user_id
-- Policies for all five tables are re-asserted at the end so a database that
-- applied an early draft also gets the final row-level rules.

-- ── tasks ────────────────────────────────────────────────────────────────────

alter table public.tasks add column if not exists notes text;
alter table public.tasks add column if not exists done_at timestamptz;
alter table public.tasks
  add column if not exists alert_id uuid references public.alerts(id) on delete set null;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tasks' and column_name = 'description') then
    update public.tasks set notes = description where notes is null and description is not null;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tasks' and column_name = 'completed_at') then
    update public.tasks set done_at = completed_at where done_at is null and completed_at is not null;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'tasks' and column_name = 'related_alert_id') then
    update public.tasks t
      set alert_id = t.related_alert_id
      where t.alert_id is null and t.related_alert_id is not null
        and exists (select 1 from public.alerts a where a.id = t.related_alert_id);
  end if;
end $$;

-- ── staff_scores ─────────────────────────────────────────────────────────────

alter table public.staff_scores add column if not exists activity_count integer not null default 0;
alter table public.staff_scores add column if not exists computed_at timestamptz not null default now();

-- The upsert target must exist even if an early draft table is present.
delete from public.staff_scores a
  using public.staff_scores b
  where a.organization_id = b.organization_id
    and a.user_id = b.user_id
    and a.score_date = b.score_date
    and a.created_at < b.created_at;
create unique index if not exists staff_scores_org_user_date_unique
  on public.staff_scores (organization_id, user_id, score_date);

-- ── ai_briefings ─────────────────────────────────────────────────────────────

alter table public.ai_briefings add column if not exists kind text not null default 'daily';
alter table public.ai_briefings add column if not exists for_date date;
alter table public.ai_briefings add column if not exists context jsonb not null default '{}'::jsonb;
alter table public.ai_briefings add column if not exists generated_by uuid references auth.users(id) on delete set null;
alter table public.ai_briefings add column if not exists generated_at timestamptz not null default now();

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'ai_briefings' and column_name = 'period_type') then
    update public.ai_briefings set kind = period_type where period_type in ('daily', 'weekly');
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'ai_briefings' and column_name = 'period_key') then
    update public.ai_briefings
      set for_date = period_key::date
      where for_date is null and period_key ~ '^\d{4}-\d{2}-\d{2}$';
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'ai_briefings' and column_name = 'input_snapshot') then
    update public.ai_briefings set context = input_snapshot where context = '{}'::jsonb and input_snapshot is not null;
  end if;
end $$;

update public.ai_briefings
  set for_date = (created_at at time zone 'Asia/Kuala_Lumpur')::date
  where for_date is null;

-- Briefing rows are a regenerable cache; keep the newest per (org, kind, day)
-- so the upsert target index can be created.
delete from public.ai_briefings a
  using public.ai_briefings b
  where a.organization_id = b.organization_id
    and a.kind = b.kind
    and a.for_date = b.for_date
    and a.created_at < b.created_at;

alter table public.ai_briefings alter column for_date set not null;
create unique index if not exists ai_briefings_org_kind_for_date_unique
  on public.ai_briefings (organization_id, kind, for_date);

-- ── notification_channels ────────────────────────────────────────────────────

alter table public.notification_channels add column if not exists kind text;
alter table public.notification_channels add column if not exists target text;
alter table public.notification_channels add column if not exists last_sent_at timestamptz;
alter table public.notification_channels add column if not exists last_error text;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'notification_channels' and column_name = 'channel_type') then
    update public.notification_channels set kind = channel_type where kind is null and channel_type in ('telegram', 'whatsapp');
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'notification_channels' and column_name = 'endpoint_url') then
    update public.notification_channels set target = endpoint_url where target is null and endpoint_url is not null;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'notification_channels' and column_name = 'config') then
    update public.notification_channels
      set target = coalesce(target, config ->> 'target', config ->> 'chat_id')
      where target is null and config is not null;
  end if;
end $$;

-- ── ai_chat_sessions ─────────────────────────────────────────────────────────

alter table public.ai_chat_sessions add column if not exists user_id uuid references auth.users(id) on delete cascade;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'ai_chat_sessions' and column_name = 'created_by') then
    update public.ai_chat_sessions set user_id = created_by where user_id is null;
  end if;
end $$;

-- ── Policy re-assertion (final intended model) ───────────────────────────────

-- alerts: every member reads; any member may write once the Manager Zone is
-- unlocked at the app layer (the database cannot see the unlock cookie).
drop policy if exists "alerts_write_leadership" on public.alerts;
drop policy if exists "alerts_select_member" on public.alerts;
drop policy if exists "alerts_write_member" on public.alerts;
create policy "alerts_select_member"
  on public.alerts for select to authenticated
  using (public.is_org_member(organization_id));
create policy "alerts_write_member"
  on public.alerts for all to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- tasks: same member model.
drop policy if exists "tasks_select_member" on public.tasks;
drop policy if exists "tasks_insert_leadership" on public.tasks;
drop policy if exists "tasks_insert_member" on public.tasks;
drop policy if exists "tasks_update_member" on public.tasks;
drop policy if exists "tasks_delete_leadership" on public.tasks;
drop policy if exists "tasks_delete_member" on public.tasks;
create policy "tasks_select_member"
  on public.tasks for select to authenticated
  using (public.is_org_member(organization_id));
create policy "tasks_insert_member"
  on public.tasks for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "tasks_update_member"
  on public.tasks for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy "tasks_delete_member"
  on public.tasks for delete to authenticated
  using (public.is_org_member(organization_id));

-- staff_scores: leadership reads all; a member reads their own row; owner/admin write.
drop policy if exists "staff_scores_select" on public.staff_scores;
drop policy if exists "staff_scores_write" on public.staff_scores;
create policy "staff_scores_select"
  on public.staff_scores for select to authenticated
  using (
    public.has_org_role(organization_id, array['owner','admin','supervisor','manager']::public.membership_role[])
    or user_id = auth.uid()
  );
create policy "staff_scores_write"
  on public.staff_scores for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));

-- AI layer tables: owner/admin only.
drop policy if exists "ai_briefings_select_owner" on public.ai_briefings;
drop policy if exists "ai_briefings_write_owner" on public.ai_briefings;
create policy "ai_briefings_select_owner"
  on public.ai_briefings for select to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));
create policy "ai_briefings_write_owner"
  on public.ai_briefings for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));

drop policy if exists "notification_channels_owner" on public.notification_channels;
create policy "notification_channels_owner"
  on public.notification_channels for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));

drop policy if exists "ai_chat_sessions_owner" on public.ai_chat_sessions;
create policy "ai_chat_sessions_owner"
  on public.ai_chat_sessions for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));

drop policy if exists "ai_chat_messages_owner" on public.ai_chat_messages;
create policy "ai_chat_messages_owner"
  on public.ai_chat_messages for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.membership_role[]));
