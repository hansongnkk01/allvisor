-- Clinic / shop logo for nav + invoices
-- Tip: if SQL Editor shows deadlock (40P01), re-run this after a few seconds,
-- or run STEP 1 then STEP 2 separately while the app is idle.

-- ===== STEP 1: columns =====
alter table public.organizations
  add column if not exists logo_url text;

alter table public.organizations
  add column if not exists logo_shape text;

update public.organizations
set logo_shape = 'round'
where logo_shape is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organizations_logo_shape_check'
  ) then
    alter table public.organizations
      add constraint organizations_logo_shape_check
      check (logo_shape in ('round', 'square'));
  end if;
end $$;

comment on column public.organizations.logo_url is
  'Clinic logo as data URL (preferred) or public Storage URL';
comment on column public.organizations.logo_shape is
  'Display frame for logo: round or square';

-- ===== STEP 2: storage bucket + policies =====
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "org_logos_public_read" on storage.objects;
create policy "org_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'org-logos');

drop policy if exists "org_logos_member_insert" on storage.objects;
create policy "org_logos_member_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'org-logos'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner','admin','supervisor','manager']::public.membership_role[]
    )
  );

drop policy if exists "org_logos_member_update" on storage.objects;
create policy "org_logos_member_update"
  on storage.objects for update
  using (
    bucket_id = 'org-logos'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner','admin','supervisor','manager']::public.membership_role[]
    )
  );

drop policy if exists "org_logos_member_delete" on storage.objects;
create policy "org_logos_member_delete"
  on storage.objects for delete
  using (
    bucket_id = 'org-logos'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner','admin','supervisor','manager']::public.membership_role[]
    )
  );
