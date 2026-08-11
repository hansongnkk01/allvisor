-- Integrity hardening: hotel deposit vs stay invoice, unique source invoices, refund uniqueness

alter table public.hotel_stays
  add column if not exists deposit_invoice_id uuid references public.invoices (id) on delete set null;

alter table public.gym_checkins
  add column if not exists membership_id uuid references public.gym_memberships (id) on delete set null;

-- One invoice per source entity + type (prevents double-create races)
create unique index if not exists invoices_org_source_unique_idx
  on public.invoices (organization_id, source_type, source_entity_id)
  where source_type is not null and source_entity_id is not null;

-- One refund document per original invoice
create unique index if not exists invoices_refund_of_unique_idx
  on public.invoices (organization_id, refund_of_invoice_id)
  where refund_of_invoice_id is not null;
