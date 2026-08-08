-- Smart inventory cycle counts (Phase 4). Additive only.
-- Reorder suggestions and dead stock are computed at load time from
-- stock_movements + products, so they need no table — this one exists solely
-- for the cycle-count workflow (pick SKUs, count, adjust through the existing
-- stock-adjustment action).

create table if not exists public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,

  -- What the system believed when the count was started.
  expected_qty numeric not null,
  -- Null until the counter submits.
  counted_qty numeric,
  status text not null default 'pending'
    check (status in ('pending', 'submitted')),

  counted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index if not exists stock_counts_org_status_idx
  on public.stock_counts (organization_id, status, created_at desc);

alter table public.stock_counts enable row level security;

-- Any member can see and work the count list (staff do the counting).
drop policy if exists "stock_counts_select_member" on public.stock_counts;
create policy "stock_counts_select_member"
  on public.stock_counts
  for select
  to authenticated
  using (public.is_org_member(organization_id));

-- Starting a count writes rows; the server action validates, so membership is
-- the right bar — the same people already adjust stock from this page.
drop policy if exists "stock_counts_insert_member" on public.stock_counts;
create policy "stock_counts_insert_member"
  on public.stock_counts
  for insert
  to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists "stock_counts_update_member" on public.stock_counts;
create policy "stock_counts_update_member"
  on public.stock_counts
  for update
  to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "stock_counts_delete_leadership" on public.stock_counts;
create policy "stock_counts_delete_leadership"
  on public.stock_counts
  for delete
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin','supervisor','manager']::public.membership_role[]
    )
  );
