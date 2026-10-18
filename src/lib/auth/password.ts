import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt with 12 salt rounds.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  if (!plaintext || plaintext.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  if (!plaintext || !hash) {
    return false;
  }
  return bcrypt.compare(plaintext, hash);
}

/**
 * Hashes a numeric POS PIN (e.g., 4 or 6 digits) for shopkeeper quick switching.
 */
export async function hashPin(pin: string): Promise<string> {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error("PIN must be between 4 and 6 digits");
  }
  return bcrypt.hash(pin, 10);
}

/**
 * Verifies a numeric POS PIN against a stored hash.
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!pin || !hash) {
    return false;
  }
  return bcrypt.compare(pin, hash);
}
