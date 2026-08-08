-- Manager Zone unlock model (post-testing fix).
--
-- The Manager Zone (alerts queue, tasks, admin/accounting/LHDN pages) is gated
-- by the zone password at the app layer: any org member who enters the correct
-- password may work the zone from any staff account. The database cannot see
-- that unlock cookie, so the leadership-only write policies below blocked
-- legitimate unlocked members. Zone writes are therefore opened to all org
-- members; the password remains the real gate, enforced by server actions.
--
-- Ownership-level settings (org identity, plan, notification channels, feature
-- flag) stay role-gated in the server actions and are unaffected here.

drop policy if exists "alerts_write_leadership" on public.alerts;
create policy "alerts_write_member"
  on public.alerts
  for all
  to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "tasks_insert_leadership" on public.tasks;
create policy "tasks_insert_member"
  on public.tasks
  for insert
  to authenticated
  with check (public.is_org_member(organization_id));

drop policy if exists "tasks_update_member" on public.tasks;
create policy "tasks_update_member"
  on public.tasks
  for update
  to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "tasks_delete_leadership" on public.tasks;
create policy "tasks_delete_member"
  on public.tasks
  for delete
  to authenticated
  using (public.is_org_member(organization_id));
