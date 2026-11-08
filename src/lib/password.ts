/**
 * Password hashing with SHA-256 (Web Crypto API).
 *
 * Every password gets its own random 16-byte salt, so two users with the same password get
 * different hashes. The stored value is:
 *     sha256$<32 hex chars of salt>$<64 hex chars of SHA-256(salt + password)>
 * The plain-text password is never stored.
 */
export const HASH_PREFIX = "sha256";
const SALT_BYTES = 16;
const encoder = new TextEncoder();

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function fromHex(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** SHA-256 of the concatenated byte arrays, as lowercase hex. */
export async function sha256Hex(...parts: Uint8Array[]): Promise<string> {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    buffer.set(p, offset);
    offset += p.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return toHex(new Uint8Array(digest));
}

export function randomHex(bytes: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await sha256Hex(salt, encoder.encode(password));
  return `${HASH_PREFIX}$${toHex(salt)}$${hash}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (typeof password !== "string" || !stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) return false;
  const salt = fromHex(parts[1]);
  if (!salt) return false;
  const actual = await sha256Hex(salt, encoder.encode(password));
  return constantTimeEqual(actual, parts[2].toLowerCase());
}

/** Compares two strings without leaking where they differ (timing-safe). */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function utf8(text: string): Uint8Array {
  return encoder.encode(text);
}
