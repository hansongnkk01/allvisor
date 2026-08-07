-- Follow-up email sequence for the /start playbook leads.
-- Additive: marketing_leads gains two columns, and one new log table is created.

alter table public.marketing_leads
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists marketing_leads_unsub_token_idx
  on public.marketing_leads (unsubscribe_token);

-- One row per email actually handed to the provider. The unique constraint is
-- what makes the cron safe to re-run: a step can never be sent twice.
create table if not exists public.marketing_emails (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.marketing_leads(id) on delete cascade,
  step smallint not null,
  status text not null default 'sent',
  provider_id text,
  error text,
  sent_at timestamptz not null default now(),

  unique (lead_id, step)
);

create index if not exists marketing_emails_lead_idx
  on public.marketing_emails (lead_id, step);
create index if not exists marketing_emails_sent_idx
  on public.marketing_emails (sent_at desc);

-- Both tables are service-role only for reads and writes. marketing_leads keeps
-- its public insert policy from 024 so the opt-in form still works; nothing here
-- grants a browser client the ability to read an email address.
alter table public.marketing_emails enable row level security;
