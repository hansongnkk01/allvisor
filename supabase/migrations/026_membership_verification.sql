-- Staff must confirm their account with a code before the dashboard opens.

alter table public.memberships
  add column if not exists verified_at timestamptz,
  add column if not exists verification_code text;

-- Everyone who is already working keeps working: only members added from now on
-- start unverified.
update public.memberships
  set verified_at = coalesce(verified_at, created_at, now())
  where verified_at is null;

-- Owners never need to confirm; they created the business themselves.
create index if not exists memberships_unverified_idx
  on public.memberships (organization_id)
  where verified_at is null;
