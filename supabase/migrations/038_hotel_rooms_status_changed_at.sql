-- Repair: hotel room pipeline writes status_changed_at (037 omitted it on hotel_rooms).
alter table public.hotel_rooms
  add column if not exists status_changed_at timestamptz default now();
