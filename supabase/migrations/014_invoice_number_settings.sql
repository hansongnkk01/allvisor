-- Custom invoice number format (Admin settings)
alter table public.organizations
  add column if not exists invoice_prefix text default 'INV',
  add column if not exists invoice_next_seq integer default 1;

comment on column public.organizations.invoice_prefix is
  'Prefix for auto invoice numbers, e.g. INV → INV-2026-00001';
comment on column public.organizations.invoice_next_seq is
  'Minimum sequence used when generating the next invoice number';
