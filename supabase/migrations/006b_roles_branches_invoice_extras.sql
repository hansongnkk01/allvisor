-- STEP 2 — run AFTER 006a has succeeded (enum values already committed)

alter table public.memberships
  add column if not exists job_title text;

alter table public.customers
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists created_by_name text;

alter table public.invoices
  add column if not exists medicine_description text,
  add column if not exists medicine_amount numeric(12,2) not null default 0,
  add column if not exists additional_description text,
  add column if not exists additional_amount numeric(12,2) not null default 0;

create table if not exists public.customer_deletions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid,
  customer_name text not null,
  deleted_by uuid references public.profiles (id) on delete set null,
  deleted_by_name text,
  created_at timestamptz not null default now()
);

alter table public.customer_deletions enable row level security;

drop policy if exists "customer_deletions_select" on public.customer_deletions;
create policy "customer_deletions_select" on public.customer_deletions
  for select using (public.is_org_member(organization_id));

drop policy if exists "customer_deletions_insert" on public.customer_deletions;
create policy "customer_deletions_insert" on public.customer_deletions
  for insert with check (public.is_org_member(organization_id));

create table if not exists public.branch_link_requests (
  id uuid primary key default gen_random_uuid(),
  from_organization_id uuid not null references public.organizations (id) on delete cascade,
  to_organization_id uuid not null references public.organizations (id) on delete cascade,
  requested_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (from_organization_id, to_organization_id)
);

create table if not exists public.branch_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  linked_organization_id uuid not null references public.organizations (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (organization_id, linked_organization_id),
  check (organization_id <> linked_organization_id)
);

alter table public.branch_link_requests enable row level security;
alter table public.branch_links enable row level security;

drop policy if exists "branch_req_select" on public.branch_link_requests;
create policy "branch_req_select" on public.branch_link_requests
  for select using (
    public.is_org_member(from_organization_id) or public.is_org_member(to_organization_id)
  );

drop policy if exists "branch_req_insert" on public.branch_link_requests;
create policy "branch_req_insert" on public.branch_link_requests
  for insert with check (public.is_org_member(from_organization_id));

drop policy if exists "branch_req_update" on public.branch_link_requests;
create policy "branch_req_update" on public.branch_link_requests
  for update using (
    public.is_org_member(to_organization_id) or public.is_org_member(from_organization_id)
  );

drop policy if exists "branch_links_select" on public.branch_links;
create policy "branch_links_select" on public.branch_links
  for select using (public.is_org_member(organization_id));

drop policy if exists "branch_links_insert" on public.branch_links;
create policy "branch_links_insert" on public.branch_links
  for insert with check (public.is_org_member(organization_id));

drop policy if exists "branch_links_delete" on public.branch_links;
create policy "branch_links_delete" on public.branch_links
  for delete using (public.is_org_member(organization_id));

-- supervisor can manage memberships (alongside owner/admin)
drop policy if exists "memberships_insert_admin" on public.memberships;
create policy "memberships_insert_admin" on public.memberships
  for insert with check (
    public.has_org_role(organization_id, array['owner','admin','supervisor']::public.membership_role[])
    or not exists (select 1 from public.memberships m where m.organization_id = organization_id)
  );

drop policy if exists "memberships_update_admin" on public.memberships;
create policy "memberships_update_admin" on public.memberships
  for update using (
    public.has_org_role(organization_id, array['owner','admin','supervisor']::public.membership_role[])
  );

drop policy if exists "memberships_delete_admin" on public.memberships;
create policy "memberships_delete_admin" on public.memberships
  for delete using (
    public.has_org_role(organization_id, array['owner','admin','supervisor']::public.membership_role[])
  );
