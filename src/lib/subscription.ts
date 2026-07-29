import type { SubscriptionPlan, SubscriptionStatus } from "./types";

export const PLAN_LIMITS: Record<
  SubscriptionPlan,
  { staff: number; invoicesPerMonth: number; lhdn: boolean; label: string }
> = {
  free: { staff: 2, invoicesPerMonth: 20, lhdn: false, label: "Free" },
  starter: { staff: 5, invoicesPerMonth: 100, lhdn: true, label: "Starter" },
  growth: { staff: 15, invoicesPerMonth: 500, lhdn: true, label: "Growth" },
  pro: { staff: 100, invoicesPerMonth: 10000, lhdn: true, label: "Pro" },
};

export function canUseLhdn(
  plan: SubscriptionPlan,
  status: SubscriptionStatus
) {
  if (status === "canceled" || status === "past_due") return false;
  return PLAN_LIMITS[plan].lhdn || status === "trialing";
}

export function isSubscriptionActive(status: SubscriptionStatus) {
  return status === "active" || status === "trialing";
}
