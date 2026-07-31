-- Multi-tenant LHDN: each shop keeps TIN; Allvisor submits as intermediary on their behalf.
alter table public.organizations
  add column if not exists lhdn_brn text,
  add column if not exists lhdn_intermediary_linked boolean not null default false,
  add column if not exists lhdn_intermediary_linked_at timestamptz;

comment on column public.organizations.lhdn_brn is
  'Optional ROB/ROC/BRN for MyInvois onbehalfof when TIN is IG (format TIN:BRN).';
comment on column public.organizations.lhdn_intermediary_linked is
  'Shop confirms they authorized Allvisor as intermediary in MyInvois.';
