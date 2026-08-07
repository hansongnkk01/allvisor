-- Migration 020 tried to create a gym "memberships" table, but that name was
-- already taken by the staff membership table from 001. The table creation was
-- skipped, yet the accompanying policy still landed on the staff table and gave
-- every org member full read/write on it — enough to self-promote to owner or to
-- skip the account confirmation gate. Restore the strict policies.

drop policy if exists "memberships_all" on public.memberships;

-- A member sees the roster; anyone sees their own row.
drop policy if exists "memberships_select_member" on public.memberships;
create policy "memberships_select_member" on public.memberships
  for select using (
    public.is_org_member(organization_id) or user_id = auth.uid()
  );

-- The very first membership of a brand new organization has no admin to approve
-- it, so that single case stays open.
drop policy if exists "memberships_insert_admin" on public.memberships;
create policy "memberships_insert_admin" on public.memberships
  for insert with check (
    public.has_org_role(
      organization_id,
      array['owner','admin','supervisor']::public.membership_role[]
    )
    or not exists (
      select 1 from public.memberships m where m.organization_id = organization_id
    )
  );

drop policy if exists "memberships_update_admin" on public.memberships;
create policy "memberships_update_admin" on public.memberships
  for update using (
    public.has_org_role(
      organization_id,
      array['owner','admin','supervisor']::public.membership_role[]
    )
  );

drop policy if exists "memberships_delete_admin" on public.memberships;
create policy "memberships_delete_admin" on public.memberships
  for delete using (
    public.has_org_role(
      organization_id,
      array['owner','admin','supervisor']::public.membership_role[]
    )
  );
