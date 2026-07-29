-- Fix org creation chicken-and-egg (INSERT + SELECT before membership exists)

create or replace function public.create_organization(
  org_name text,
  org_niche public.niche_type,
  org_locale text default 'ms'
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org public.organizations;
  already_member boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select exists (
    select 1 from public.memberships m where m.user_id = auth.uid()
  ) into already_member;

  if already_member then
    raise exception 'Organization already exists for this user';
  end if;

  insert into public.organizations (
    name,
    niche,
    locale_default,
    subscription_plan,
    subscription_status
  )
  values (
    org_name,
    org_niche,
    org_locale,
    'starter',
    'trialing'
  )
  returning * into new_org;

  insert into public.memberships (organization_id, user_id, role)
  values (new_org.id, auth.uid(), 'owner');

  return new_org;
end;
$$;

revoke all on function public.create_organization(text, public.niche_type, text) from public;
grant execute on function public.create_organization(text, public.niche_type, text) to authenticated;
