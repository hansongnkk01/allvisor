-- Clinic / shop logo for nav + invoices
alter table public.organizations
  add column if not exists logo_url text,
  add column if not exists logo_shape text not null default 'round'
    check (logo_shape in ('round', 'square'));

comment on column public.organizations.logo_url is
  'Public URL of clinic logo (Supabase Storage org-logos bucket)';
comment on column public.organizations.logo_shape is
  'Display frame for logo: round or square';

-- Public bucket so logos render in nav / printed invoices
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
