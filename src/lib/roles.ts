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

/** Can manage staff (add/kick): owner or admin only */
export function canManageStaff(role: MembershipRole) {
  return role === "owner" || role === "admin";
}

/** Can edit invoice custom number/name */
export function canEditInvoiceIdentity(role: MembershipRole) {
  return canAccessSensitive(role);
}
