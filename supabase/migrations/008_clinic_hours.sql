-- Clinic operating hours & weekly closed days

alter table public.organizations
  add column if not exists clinic_open_hour integer not null default 0
    check (clinic_open_hour >= 0 and clinic_open_hour <= 23),
  add column if not exists clinic_close_hour integer not null default 23
    check (clinic_close_hour >= 0 and clinic_close_hour <= 23),
  add column if not exists closed_weekdays integer[] not null default '{}';
