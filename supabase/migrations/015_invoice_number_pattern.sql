-- Customizable invoice number pattern + sequence padding
alter table public.organizations
  add column if not exists invoice_seq_digits integer default 5,
  add column if not exists invoice_number_pattern text default '{PREFIX}-{YYYY}-{SEQ}';

comment on column public.organizations.invoice_seq_digits is
  'Zero-pad width for {SEQ}, e.g. 5 → 00001';
comment on column public.organizations.invoice_number_pattern is
  'Template using {PREFIX} {YYYY} {YY} {MM} {DD} {SEQ}, e.g. INV-{YYYY}-{SEQ}';
