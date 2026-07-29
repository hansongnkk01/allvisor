-- Patient risk labels

alter table public.customers
  add column if not exists risk_level text
  check (risk_level is null or risk_level in ('high', 'medium', 'low'));
