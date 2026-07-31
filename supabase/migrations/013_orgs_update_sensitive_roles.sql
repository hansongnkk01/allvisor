-- Allow supervisor/manager to update org settings (TIN / LHDN), matching app canAccessSensitive.
drop policy if exists "orgs_update_admin" on public.organizations;
create policy "orgs_update_admin" on public.organizations
  for update
  using (
    public.has_org_role(
      id,
      array['owner','admin','supervisor','manager']::public.membership_role[]
    )
  );
