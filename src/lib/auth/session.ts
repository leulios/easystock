import crypto from "crypto";

export const SESSION_COOKIE_NAME = "easystock_session";
export const SESSION_DURATION_DAYS = 14;

/**
 * Generates a 256-bit cryptographically secure pseudorandom session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes a SHA-256 hash of a session token for secure database storage.
 * The database never stores the raw session token.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Computes the session expiry timestamp (default 14 days from now).
 */
export function getSessionExpiryDate(days = SESSION_DURATION_DAYS): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}
