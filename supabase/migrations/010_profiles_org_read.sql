-- Allow org members to read profiles of teammates (fixes admin staff list names)

drop policy if exists "profiles_select_org_mates" on public.profiles;

create policy "profiles_select_org_mates"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.memberships m1
      join public.memberships m2 on m1.organization_id = m2.organization_id
      where m1.user_id = auth.uid()
        and m2.user_id = profiles.id
    )
  );
