-- Marketing HVCO / lead capture (public opt-in from /start)
create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  source text not null default 'hvco_start',
  locale text,
  created_at timestamptz not null default now()
);

create index if not exists marketing_leads_email_idx on public.marketing_leads (email);
create index if not exists marketing_leads_created_at_idx on public.marketing_leads (created_at desc);

alter table public.marketing_leads enable row level security;

drop policy if exists "marketing_leads_insert_public" on public.marketing_leads;
create policy "marketing_leads_insert_public"
  on public.marketing_leads
  for insert
  to anon, authenticated
  with check (
    char_length(trim(full_name)) >= 1
    and char_length(trim(email)) >= 3
    and email like '%@%'
  );

-- No public select/update/delete — admins use service role / SQL editor
