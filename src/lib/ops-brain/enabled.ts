import type { Organization, OpsBrainSettings } from "@/lib/types";

const DEFAULTS: Required<OpsBrainSettings> = {
  refund_rate_pct: 10,
  void_rate_pct: 8,
  cash_variance_rm: 20,
  cash_variance_pct: 2,
  lead_time_days: 7,
  safety_stock_days: 3,
  dead_stock_days: 40,
};

export function isOpsBrainEnabled(
  org: Pick<Organization, "ops_brain_enabled"> | null | undefined
): boolean {
  return Boolean(org?.ops_brain_enabled);
}

export function getOpsBrainSettings(
  org: Pick<Organization, "ops_brain_settings"> | null | undefined
): Required<OpsBrainSettings> {
  const raw = (org?.ops_brain_settings || {}) as OpsBrainSettings;
  return {
    refund_rate_pct: Number(raw.refund_rate_pct ?? DEFAULTS.refund_rate_pct),
    void_rate_pct: Number(raw.void_rate_pct ?? DEFAULTS.void_rate_pct),
    cash_variance_rm: Number(raw.cash_variance_rm ?? DEFAULTS.cash_variance_rm),
    cash_variance_pct: Number(raw.cash_variance_pct ?? DEFAULTS.cash_variance_pct),
    lead_time_days: Number(raw.lead_time_days ?? DEFAULTS.lead_time_days),
    safety_stock_days: Number(raw.safety_stock_days ?? DEFAULTS.safety_stock_days),
    dead_stock_days: Number(raw.dead_stock_days ?? DEFAULTS.dead_stock_days),
  };
}
