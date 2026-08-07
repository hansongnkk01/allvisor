import type { Audience, MembershipRole } from "@/lib/types";

/**
 * Owner-facing oversight versus floor operations.
 * Supervisor and manager run the floor, so they belong to the staff experience.
 */
export function audienceForRole(role: MembershipRole): Audience {
  return role === "owner" || role === "admin" ? "admin" : "staff";
}

/** Owner area: /admin-dashboard, /team, /performance, /cashflow, /marketing */
export function canAccessOwnerArea(role: MembershipRole) {
  return audienceForRole(role) === "admin";
}

/**
 * Ownership-level controls: business identity, billing plan and the Admin Zone
 * password itself. Supervisor and manager run the floor, so they must not be able
 * to rename the business, change its tax numbers, or lock the owner out.
 */
export function canManageOrgSettings(role: MembershipRole) {
  return role === "owner" || role === "admin";
}

/** Sensitive sections (Admin / Accounting / LHDN): owner, admin, supervisor, manager */
export function canAccessSensitive(role: MembershipRole) {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "supervisor" ||
    role === "manager"
  );
}

/** Admin catalog + branch UI access (same set as sensitive) */
export function canAccessAdmin(role: MembershipRole) {
  return canAccessSensitive(role);
}

/** Can manage staff (add/kick) from Admin team panel */
export function canManageStaff(role: MembershipRole) {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "supervisor" ||
    role === "manager"
  );
}

/** Roles the actor may assign when adding a team member. */
export function assignableStaffRoles(actor: MembershipRole): MembershipRole[] {
  if (actor === "owner" || actor === "admin") {
    return ["staff", "supervisor", "manager", "admin"];
  }
  if (actor === "supervisor") {
    return ["staff", "manager"];
  }
  if (actor === "manager") {
    return ["staff"];
  }
  return [];
}

/** Roles the actor may remove (never includes owner). */
export function kickableStaffRoles(actor: MembershipRole): MembershipRole[] {
  if (actor === "owner" || actor === "admin") {
    return ["admin", "supervisor", "manager", "staff"];
  }
  if (actor === "supervisor") {
    return ["manager", "staff"];
  }
  if (actor === "manager") {
    return ["staff"];
  }
  return [];
}

export function staffRoleLabel(role: MembershipRole | string) {
  if (role === "admin") return "co-admin";
  return role;
}

/** Can edit invoice custom number/name */
export function canEditInvoiceIdentity(role: MembershipRole) {
  return canAccessSensitive(role);
}
