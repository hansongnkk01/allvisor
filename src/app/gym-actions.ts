"use server";

import { requireMemberWithCapability } from "@/lib/require-capability";
import { canManageOrgSettings } from "@/lib/roles";
import { logActivity } from "@/lib/activity";
import { revalidateApp } from "@/lib/revalidate";
import { formatDayKeyMY } from "@/lib/datetime-my";

export type WalkInPackage = {
  id: string;
  name: string;
  minutes: number;
  price: number;
  is_active: boolean;
};

export type WalkInSession = {
  id: string;
  customer_name: string;
  ic_number: string | null;
  address: string | null;
  package_name: string | null;
  amount: number;
  minutes: number;
  started_at: string;
  expires_at: string;
  status: "active" | "expired" | "done";
};

export type ExpiredMembership = {
  id: string;
  customer_name: string;
  plan_name: string;
  ends_on: string | null;
};

export type GymPresenceSnapshot = {
  activeWalkIns: WalkInSession[];
  /** Walk-ins whose paid time ran out (last 6 hours) — popup candidates. */
  expiredWalkIns: WalkInSession[];
  /** Memberships that expired within the last 14 days — popup candidates. */
  expiredMemberships: ExpiredMembership[];
  error?: string;
};

async function requireGymMember() {
  const ctx = await requireMemberWithCapability("memberships");
  if (ctx.organization.niche !== "gym") {
    throw new Error("Walk-in tracking is only available for the gym niche");
  }
  return ctx;
}

/** Counter sale: pick an admin-defined package → price + duration come from it. */
export async function createWalkInSessionAction(formData: FormData) {
  const { supabase, organization, profile } = await requireGymMember();

  const name = String(formData.get("customer_name") || "").trim();
  const icNumber = String(formData.get("ic_number") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const packageId = String(formData.get("package_id") || "");

  if (!name) return { error: "Full name required" };
  if (name.length > 80) return { error: "Name too long" };
  if (!icNumber) return { error: "IC number required" };
  if (icNumber.length > 20) return { error: "IC number too long" };
  if (!address) return { error: "Address required" };
  if (address.length > 300) return { error: "Address too long" };
  if (!packageId) return { error: "Pick a walk-in package" };

  const { data: pkg } = await supabase
    .from("gym_walkin_packages")
    .select("id, name, minutes, price")
    .eq("id", packageId)
    .eq("organization_id", organization.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!pkg) return { error: "Package not found — ask the admin to set one up in the Admin tab" };

  const amount = Number(pkg.price);
  const minutes = Math.max(1, Number(pkg.minutes));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + minutes * 60_000);

  const { data: session, error } = await supabase
    .from("gym_walkin_sessions")
    .insert({
      organization_id: organization.id,
      customer_name: name,
      ic_number: icNumber,
      address,
      package_id: pkg.id,
      package_name: pkg.name,
      amount,
      minutes,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: "active",
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !session) return { error: error?.message || "Check-in failed" };

  // The payment is real income — book it so Money/Accounting stays complete.
  await supabase.from("ledger_entries").insert({
    organization_id: organization.id,
    entry_type: "income",
    source: "gym_walkin",
    source_id: session.id,
    amount,
    entry_date: formatDayKeyMY(now),
    description: `Walk-in (${pkg.name}): ${name}`,
  });

  await logActivity({
    action: "gym.walkin",
    summary: `Walk-in ${name}: ${pkg.name} · RM ${amount.toFixed(2)} · ${minutes} min`,
    entityType: "gym_walkin_session",
    entityId: session.id,
  });

  revalidateApp("/memberships", "/walkin", "/dashboard", "/accounting");
  return { success: true, id: session.id as string };
}

/** Admin defines the walk-in packages (Admin tab → Walk-in packages). */
export async function addWalkInPackageAction(formData: FormData) {
  const { supabase, organization, membership } = await requireGymMember();
  if (!canManageOrgSettings(membership.role)) return { error: "Forbidden" };

  const name = String(formData.get("name") || "").trim();
  const minutes = Number(formData.get("minutes") || 0);
  const price = Number(formData.get("price") || 0);
  if (!name || name.length > 60) return { error: "Package name required" };
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 24 * 60) {
    return { error: "Duration must be between 5 minutes and 24 hours" };
  }
  if (!Number.isFinite(price) || price < 0) return { error: "Invalid price" };

  const { error } = await supabase.from("gym_walkin_packages").insert({
    organization_id: organization.id,
    name,
    minutes: Math.round(minutes),
    price,
  });
  if (error) return { error: error.message };

  await logActivity({
    action: "gym.walkin_package",
    summary: `Walk-in package "${name}": RM ${price.toFixed(2)} · ${Math.round(minutes)} min`,
    entityType: "gym_walkin_package",
    entityId: null,
  });
  revalidateApp("/admin", "/walkin", "/memberships");
  return { success: true };
}

export async function deleteWalkInPackageAction(id: string) {
  const { supabase, organization, membership } = await requireGymMember();
  if (!canManageOrgSettings(membership.role)) return { error: "Forbidden" };
  const { error } = await supabase
    .from("gym_walkin_packages")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { error: error.message };
  revalidateApp("/admin", "/walkin", "/memberships");
  return { success: true };
}

/**
 * Poll target for the dashboard popup + the memberships page. Transitions
 * overdue sessions/memberships to `expired` exactly once (the status change
 * is the durable record), and returns everything a notifier needs.
 */
export async function gymPresenceSnapshotAction(): Promise<GymPresenceSnapshot> {
  const empty: GymPresenceSnapshot = {
    activeWalkIns: [],
    expiredWalkIns: [],
    expiredMemberships: [],
  };
  try {
    const { supabase, organization } = await requireGymMember();
    const now = new Date();
    const nowIso = now.toISOString();
    const todayKey = formatDayKeyMY(now);

    // Flip overdue walk-ins to expired (idempotent).
    await supabase
      .from("gym_walkin_sessions")
      .update({ status: "expired" })
      .eq("organization_id", organization.id)
      .eq("status", "active")
      .lte("expires_at", nowIso);

    // Flip overdue memberships to expired (idempotent).
    await supabase
      .from("gym_memberships")
      .update({ status: "expired" })
      .eq("organization_id", organization.id)
      .eq("status", "active")
      .lt("ends_on", todayKey);

    const walkinCutoff = new Date(now.getTime() - 6 * 3_600_000).toISOString();
    const membershipCutoff = new Date(now.getTime() - 14 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const sessionCols = "id, customer_name, ic_number, address, package_name, amount, minutes, started_at, expires_at, status";
    const [activeRes, expiredRes, membersRes] = await Promise.all([
      supabase
        .from("gym_walkin_sessions")
        .select(sessionCols)
        .eq("organization_id", organization.id)
        .eq("status", "active")
        .order("expires_at", { ascending: true })
        .limit(50),
      supabase
        .from("gym_walkin_sessions")
        .select(sessionCols)
        .eq("organization_id", organization.id)
        .eq("status", "expired")
        .gte("expires_at", walkinCutoff)
        .order("expires_at", { ascending: false })
        .limit(50),
      supabase
        .from("gym_memberships")
        .select("id, plan_name, ends_on, customers(name)")
        .eq("organization_id", organization.id)
        .eq("status", "expired")
        .gte("ends_on", membershipCutoff)
        .order("ends_on", { ascending: false })
        .limit(50),
    ]);

    type MemberRow = {
      id: string;
      plan_name: string;
      ends_on: string | null;
      customers: { name: string } | { name: string }[] | null;
    };
    const memberName = (row: MemberRow) => {
      const c = row.customers;
      if (!c) return "Member";
      return Array.isArray(c) ? c[0]?.name || "Member" : c.name || "Member";
    };

    return {
      activeWalkIns: (activeRes.data || []) as WalkInSession[],
      expiredWalkIns: (expiredRes.data || []) as WalkInSession[],
      expiredMemberships: ((membersRes.data || []) as MemberRow[]).map((row) => ({
        id: row.id,
        customer_name: memberName(row),
        plan_name: row.plan_name,
        ends_on: row.ends_on,
      })),
    };
  } catch {
    return { ...empty, error: "Snapshot unavailable" };
  }
}

/** Staff acknowledges an expired walk-in (customer left / paid again). */
export async function ackWalkInSessionAction(id: string) {
  const { supabase, organization } = await requireGymMember();
  const { error } = await supabase
    .from("gym_walkin_sessions")
    .update({ status: "done" })
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { error: error.message };
  revalidateApp("/memberships", "/dashboard");
  return { success: true };
}
