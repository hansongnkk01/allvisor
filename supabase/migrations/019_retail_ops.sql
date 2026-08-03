-- Retail ops foundation: products, categories, held tickets, cash sessions,
-- suppliers/GRN/transfers, printer templates.

-- ─── Product retail fields ───────────────────────────────────────────────────
alter table public.products
  add column if not exists sold_by text not null default 'each'
    check (sold_by in ('each', 'meter', 'kg')),
  add column if not exists available_to_sale boolean not null default true,
  add column if not exists track_stock boolean not null default true,
  add column if not exists image_url text,
  add column if not exists price_on_sale boolean not null default false,
  add column if not exists category_id uuid;

-- Allow fractional qty for meter/kg (safe cast from integer)
alter table public.products
  alter column quantity type numeric(14,3) using quantity::numeric;

alter table public.stock_movements
  alter column quantity type numeric(14,3) using quantity::numeric;

-- unit_price may be 0 when price_on_sale; keep column non-null default 0

-- ─── Product categories (with subcategory via parent_id) ─────────────────────
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  parent_id uuid references public.product_categories (id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists product_categories_org_idx
  on public.product_categories (organization_id);

create index if not exists product_categories_parent_idx
  on public.product_categories (parent_id);

alter table public.products
  drop constraint if exists products_category_id_fkey;

alter table public.products
  add constraint products_category_id_fkey
  foreign key (category_id) references public.product_categories (id) on delete set null;

create index if not exists products_category_idx on public.products (category_id);

alter table public.product_categories enable row level security;

drop policy if exists "product_categories_all" on public.product_categories;
create policy "product_categories_all" on public.product_categories
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ─── Held / open POS tickets ─────────────────────────────────────────────────
create table if not exists public.pos_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ticket_number text not null,
  status text not null default 'open' check (status in ('open', 'held', 'completed', 'void')),
  customer_id uuid references public.customers (id) on delete set null,
  payment_method text,
  notes text,
  created_by uuid references public.profiles (id),
  created_by_name text,
  completed_invoice_id uuid references public.invoices (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pos_ticket_lines (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.pos_tickets (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  unit_price numeric(12,2) not null default 0,
  quantity numeric(14,3) not null default 1,
  line_total numeric(12,2) not null default 0
);

create index if not exists pos_tickets_org_status_idx
  on public.pos_tickets (organization_id, status);

alter table public.pos_tickets enable row level security;
alter table public.pos_ticket_lines enable row level security;

drop policy if exists "pos_tickets_all" on public.pos_tickets;
create policy "pos_tickets_all" on public.pos_tickets
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "pos_ticket_lines_all" on public.pos_ticket_lines;
create policy "pos_ticket_lines_all" on public.pos_ticket_lines
  for all using (
    exists (
      select 1 from public.pos_tickets t
      where t.id = ticket_id and public.is_org_member(t.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.pos_tickets t
      where t.id = ticket_id and public.is_org_member(t.organization_id)
    )
  );

-- ─── Cash drawer / shift ─────────────────────────────────────────────────────
create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  opened_by uuid references public.profiles (id),
  opened_by_name text,
  closed_by uuid references public.profiles (id),
  closed_by_name text,
  opening_float numeric(12,2) not null default 0,
  closing_count numeric(12,2),
  expected_cash numeric(12,2),
  variance numeric(12,2),
  status text not null default 'open' check (status in ('open', 'closed')),
  notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  session_id uuid not null references public.cash_sessions (id) on delete cascade,
  type text not null check (type in ('in', 'out', 'sale', 'refund', 'float')),
  amount numeric(12,2) not null,
  note text,
  created_by uuid references public.profiles (id),
  created_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists cash_sessions_org_status_idx
  on public.cash_sessions (organization_id, status);

alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;

drop policy if exists "cash_sessions_all" on public.cash_sessions;
create policy "cash_sessions_all" on public.cash_sessions
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "cash_movements_all" on public.cash_movements;
create policy "cash_movements_all" on public.cash_movements
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ─── Suppliers + GRN ─────────────────────────────────────────────────────────
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  grn_number text not null,
  status text not null default 'draft' check (status in ('draft', 'received', 'cancelled')),
  notes text,
  received_by uuid references public.profiles (id),
  received_by_name text,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  grn_id uuid not null references public.goods_receipts (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  quantity numeric(14,3) not null default 0,
  unit_cost numeric(12,2) not null default 0
);

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  transfer_number text not null,
  from_location text not null default 'main',
  to_location text not null,
  to_organization_id uuid references public.organizations (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'received', 'cancelled')),
  notes text,
  created_by uuid references public.profiles (id),
  created_by_name text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.stock_transfer_lines (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.stock_transfers (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  quantity numeric(14,3) not null default 0
);

create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  adjustment_number text not null,
  reason text,
  notes text,
  created_by uuid references public.profiles (id),
  created_by_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_adjustment_lines (
  id uuid primary key default gen_random_uuid(),
  adjustment_id uuid not null references public.stock_adjustments (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity_before numeric(14,3) not null default 0,
  quantity_after numeric(14,3) not null default 0,
  delta numeric(14,3) not null default 0
);

alter table public.suppliers enable row level security;
alter table public.goods_receipts enable row level security;
alter table public.goods_receipt_lines enable row level security;
alter table public.stock_transfers enable row level security;
alter table public.stock_transfer_lines enable row level security;
alter table public.stock_adjustments enable row level security;
alter table public.stock_adjustment_lines enable row level security;

drop policy if exists "suppliers_all" on public.suppliers;
create policy "suppliers_all" on public.suppliers
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "goods_receipts_all" on public.goods_receipts;
create policy "goods_receipts_all" on public.goods_receipts
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "goods_receipt_lines_all" on public.goods_receipt_lines;
create policy "goods_receipt_lines_all" on public.goods_receipt_lines
  for all using (
    exists (
      select 1 from public.goods_receipts g
      where g.id = grn_id and public.is_org_member(g.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.goods_receipts g
      where g.id = grn_id and public.is_org_member(g.organization_id)
    )
  );

drop policy if exists "stock_transfers_all" on public.stock_transfers;
create policy "stock_transfers_all" on public.stock_transfers
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "stock_transfer_lines_all" on public.stock_transfer_lines;
create policy "stock_transfer_lines_all" on public.stock_transfer_lines
  for all using (
    exists (
      select 1 from public.stock_transfers t
      where t.id = transfer_id and public.is_org_member(t.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.stock_transfers t
      where t.id = transfer_id and public.is_org_member(t.organization_id)
    )
  );

drop policy if exists "stock_adjustments_all" on public.stock_adjustments;
create policy "stock_adjustments_all" on public.stock_adjustments
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists "stock_adjustment_lines_all" on public.stock_adjustment_lines;
create policy "stock_adjustment_lines_all" on public.stock_adjustment_lines
  for all using (
    exists (
      select 1 from public.stock_adjustments a
      where a.id = adjustment_id and public.is_org_member(a.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.stock_adjustments a
      where a.id = adjustment_id and public.is_org_member(a.organization_id)
    )
  );

-- ─── Refunds link on invoices ────────────────────────────────────────────────
alter table public.invoices
  add column if not exists refund_of_invoice_id uuid references public.invoices (id) on delete set null,
  add column if not exists created_by uuid references public.profiles (id),
  add column if not exists created_by_name text;

-- ─── Printer / label design settings (JSON templates per org) ────────────────
create table if not exists public.print_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  receipt_printer_name text,
  receipt_connection text default 'browser' check (receipt_connection in ('browser', 'bluetooth', 'usb')),
  receipt_design jsonb not null default '{"widthMm":80,"showLogo":true,"showAddress":true,"footer":"Thank you"}'::jsonb,
  sticker_printer_name text,
  sticker_connection text default 'browser' check (sticker_connection in ('browser', 'bluetooth', 'usb')),
  sticker_design jsonb not null default '{"widthMm":40,"heightMm":30,"showName":true,"showPrice":true,"showBarcode":true}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.print_settings enable row level security;

drop policy if exists "print_settings_all" on public.print_settings;
create policy "print_settings_all" on public.print_settings
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
