import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { requireUser } from "../src/services/users";
import { PASSWORD, browser, location, newUser, useTestDb } from "./support";

describe("Other Requirement 1: Passwords are stored as SHA-256 hashes, never in plain text", () => {
  const env = useTestDb();

  it("The stored value is a salted SHA-256 hash, not the password", async () => {
    const stored = (await requireUser(env.db, (await newUser(env, "CUSTOMER")).id)).passwordHash;
    expect(stored).not.toContain(PASSWORD);
    expect(stored).toMatch(/^sha256\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  });

  it("The hash equals SHA-256(salt + password) computed independently", async () => {
    const stored = (await requireUser(env.db, (await newUser(env, "CUSTOMER")).id)).passwordHash;
    const [, saltHex, hashHex] = stored.split("$");
    const expected = createHash("sha256").update(Buffer.from(saltHex, "hex")).update(PASSWORD, "utf8").digest("hex");
    expect(hashHex).toBe(expected);
  });

  it("The same password gets a different hash for every user (random salt)", async () => {
    const first = await hashPassword(PASSWORD);
    const second = await hashPassword(PASSWORD);
    expect(first).not.toBe(second);
    expect(await verifyPassword(PASSWORD, first)).toBe(true);
    expect(await verifyPassword("wrong-password", first)).toBe(false);
  });

  it("Login works with the right password and fails with a wrong one", async () => {
    const user = await newUser(env, "INTERIOR_DESIGNER");
    const good = await browser(env).loginWithPassword(user.username, PASSWORD);
    expect(location(good)).toBe("/dashboard");
    expect(good.headers.getSetCookie().join(";")).toContain("pid_session=");
    expect(location(await browser(env).loginWithPassword(user.username, "not-the-password"))).toBe("/login?error");
  });
});
