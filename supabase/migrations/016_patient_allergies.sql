-- Patient allergies for safety banner on appointments / invoices
alter table public.customers
  add column if not exists allergies text;

comment on column public.customers.allergies is
  'Free-text allergies / alerts shown as a red safety banner';
