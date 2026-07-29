import type { MembershipRole } from "@/lib/types";

/** Admin section access: owner, admin, supervisor */
export function canAccessAdmin(role: MembershipRole) {
  return role === "owner" || role === "admin" || role === "supervisor";
}

/** Can manage staff (add/kick): owner or admin only */
export function canManageStaff(role: MembershipRole) {
  return role === "owner" || role === "admin";
}

/** Can edit invoice custom number/name */
export function canEditInvoiceIdentity(role: MembershipRole) {
  return canAccessAdmin(role);
}
