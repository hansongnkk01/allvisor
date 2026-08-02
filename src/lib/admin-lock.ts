import { createHash } from "crypto";

export type LockedSection = "admin" | "accounting" | "lhdn";

export const ADMIN_ZONE_SECTIONS: LockedSection[] = ["admin", "accounting", "lhdn"];

export function hashAdminPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function defaultAdminPassword(orgName: string, createdAt: string) {
  const year = new Date(createdAt).getFullYear();
  const clean = orgName.replace(/\s+/g, "");
  return `${clean}${year}`;
}

export function verifyAdminPassword(
  input: string,
  storedHash: string | null | undefined,
  orgName: string,
  createdAt: string
) {
  const expected = storedHash || hashAdminPassword(defaultAdminPassword(orgName, createdAt));
  return hashAdminPassword(input) === expected;
}

export function sectionCookieName(orgId: string, section: LockedSection) {
  return `allvisor_${section}_${orgId}`;
}

/** Shared cookie: unlock admin + accounting + LHDN together. */
export function adminZoneCookieName(orgId: string) {
  return `allvisor_zone_${orgId}`;
}
