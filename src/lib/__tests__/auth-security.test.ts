import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, hashPin, verifyPin } from "../auth/password";
import { generateSessionToken, hashSessionToken } from "../auth/session";

describe("Authentication & Cryptographic Security", () => {
  it("hashes passwords securely with bcrypt and verifies correct passwords", async () => {
    const password = "StrongPassword2026!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword("WrongPassword123", hash);
    expect(isWrongMatch).toBe(false);
  });

  it("rejects short passwords under 8 characters", async () => {
    await expect(hashPassword("short1")).rejects.toThrow("Password must be at least 8 characters");
  });

  it("hashes and verifies numeric POS PIN codes", async () => {
    const pin = "4819";
    const pinHash = await hashPin(pin);

    expect(await verifyPin("4819", pinHash)).toBe(true);
    expect(await verifyPin("9999", pinHash)).toBe(false);
  });

  it("rejects non-numeric or invalid length PINs", async () => {
    await expect(hashPin("12")).rejects.toThrow("PIN must be between 4 and 6 digits");
    await expect(hashPin("abcd")).rejects.toThrow("PIN must be between 4 and 6 digits");
    await expect(hashPin("12345678")).rejects.toThrow("PIN must be between 4 and 6 digits");
  });

  it("generates high-entropy 256-bit session tokens with SHA-256 database hashing", () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();

    expect(token1).toHaveLength(64); // 32 bytes in hex = 64 characters
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);

    const hash1 = hashSessionToken(token1);
    const hash2 = hashSessionToken(token2);

    expect(hash1).toHaveLength(64);
    expect(hash1).not.toBe(token1);
    expect(hash1).not.toBe(hash2);

    // Hashing same token produces deterministic hash
    expect(hashSessionToken(token1)).toBe(hash1);
  });
});
