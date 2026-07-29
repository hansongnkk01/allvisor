import { createHash } from "crypto";

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
