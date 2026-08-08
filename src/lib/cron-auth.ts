import { timingSafeEqual } from "crypto";

/**
 * Vercel Cron calls routes with a CRON_SECRET bearer token. Compare in
 * constant time so the secret cannot be probed byte-by-byte via timing.
 * Fails closed when the secret is not configured.
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
