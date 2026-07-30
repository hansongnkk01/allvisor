-- Patient address for clinic CRM

alter table public.customers
  add column if not exists address text;
