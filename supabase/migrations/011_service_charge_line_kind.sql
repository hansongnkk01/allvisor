-- Org service charge % + invoice line kinds (service / medicine / additional / service_charge)

alter table public.organizations
  add column if not exists service_charge_percent numeric(6,2) not null default 0
    check (service_charge_percent >= 0 and service_charge_percent <= 100);

alter table public.invoice_lines
  add column if not exists line_kind text not null default 'service'
    check (line_kind in ('service', 'medicine', 'additional', 'service_charge'));

-- Backfill existing lines
update public.invoice_lines
set line_kind = 'service'
where line_kind is null or line_kind = '';
