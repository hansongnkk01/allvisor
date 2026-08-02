import type { MembershipRole } from "@/lib/types";

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

/** Can manage staff (add/kick): owner, co-admin (admin), or supervisor */
export function canManageStaff(role: MembershipRole) {
  return role === "owner" || role === "admin" || role === "supervisor";
}

/** Roles the actor may assign when adding a team member. */
export function assignableStaffRoles(actor: MembershipRole): MembershipRole[] {
  if (actor === "owner" || actor === "admin") {
    return ["staff", "manager", "supervisor", "admin"];
  }
  if (actor === "supervisor") {
    return ["staff", "manager"];
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
