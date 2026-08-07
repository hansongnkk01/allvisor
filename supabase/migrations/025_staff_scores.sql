-- Daily rule-based staff scoring. Additive: no existing table is touched.

create table if not exists public.staff_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score_date date not null,

  -- Raw inputs are kept so the score can always be explained to the staff member.
  sales_amount numeric(12,2) not null default 0,
  transaction_count integer not null default 0,
  average_basket numeric(12,2) not null default 0,
  refund_count integer not null default 0,
  void_count integer not null default 0,
  refund_rate numeric(5,2) not null default 0,
  void_rate numeric(5,2) not null default 0,
  activity_count integer not null default 0,
  hours_worked numeric(5,2),

  -- 0.00 to 100.00
  score numeric(5,2) not null default 0,
  notes text,

  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  unique (organization_id, user_id, score_date)
);

create index if not exists staff_scores_org_date_idx
  on public.staff_scores (organization_id, score_date desc);
create index if not exists staff_scores_org_user_date_idx
  on public.staff_scores (organization_id, user_id, score_date desc);

alter table public.staff_scores enable row level security;

-- Leadership sees everyone; a staff member may read only their own row.
drop policy if exists "staff_scores_select" on public.staff_scores;
create policy "staff_scores_select"
  on public.staff_scores
  for select
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin','supervisor','manager']::public.membership_role[]
    )
    or user_id = auth.uid()
  );

-- Only the owner or a co-admin may write scores.
drop policy if exists "staff_scores_write" on public.staff_scores;
create policy "staff_scores_write"
  on public.staff_scores
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
