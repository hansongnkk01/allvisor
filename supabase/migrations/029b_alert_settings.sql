-- Phase 2: per-org thresholds for the loss-prevention rule engine.
-- Keys inside the jsonb: refund_rate_percent, cash_variance_rm, stock_leak_rm.
-- Missing keys fall back to DEFAULT_ALERT_SETTINGS in src/lib/alert-rules.ts.

alter table public.organizations
  add column if not exists alert_settings jsonb not null default '{}'::jsonb;
