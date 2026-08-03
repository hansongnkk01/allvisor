-- Product barcode for retail POS scan / search
alter table public.products
  add column if not exists barcode text;

create index if not exists products_org_barcode_idx
  on public.products (organization_id, barcode)
  where barcode is not null;

comment on column public.products.barcode is
  'Optional barcode / EAN for POS scan (separate from SKU)';
