import { describe, expect, it } from "vitest";
import { BusinessError } from "../src/lib/errors";
import { getCompany, saveCompany } from "../src/services/catalog";
import { getProject } from "../src/services/projects";
import { disableUser, requireUser } from "../src/services/users";
import { asUser, browser, location, newProject, newUser, useTestDb } from "./support";

describe("Feature 10: User Admin disables a user without deleting the user's data", () => {
  const env = useTestDb();

  it("A disabled user cannot log in", async () => {
    const admin = await asUser(env, await newUser(env, "USER_ADMIN"));
    const customer = await newUser(env, "CUSTOMER");
    expect((await admin.post(`/admin/users/${customer.id}/disable`, { reason: "Misuse" })).status).toBe(302);
    expect((await requireUser(env.db, customer.id)).status).toBe("DISABLED");
    expect(location(await browser(env).loginWithPassword(customer.username))).toBe("/login?disabled");
  });

  it("All of the disabled user's data is kept", async () => {
    const admin = await newUser(env, "USER_ADMIN");
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const project = await newProject(env, designer, "Keep me");
    await saveCompany(env.db, designer.id, { name: "Kept Company" });
    await disableUser(env.db, admin.id, designer.id, "Investigation");
    const stored = await requireUser(env.db, designer.id);
    expect(stored.status).toBe("DISABLED");
    expect(stored.statusReason).toBe("Investigation");
    expect(stored.passwordHash).toMatch(/^sha256\$/);
    expect(await getProject(env.db, project.id)).not.toBeNull();
    expect(await getCompany(env.db, designer.id)).not.toBeNull();
  });

  it("Re-enabling the account restores access", async () => {
    const admin = await newUser(env, "USER_ADMIN");
    const customer = await newUser(env, "CUSTOMER");
    await disableUser(env.db, admin.id, customer.id, null);
    expect((await (await asUser(env, admin)).post(`/admin/users/${customer.id}/enable`)).status).toBe(302);
    expect(location(await browser(env).loginWithPassword(customer.username))).toBe("/dashboard");
  });

  it("Admins cannot disable themselves and only User Admins can disable accounts", async () => {
    const admin = await newUser(env, "USER_ADMIN");
    const customer = await newUser(env, "CUSTOMER");
    await expect(disableUser(env.db, admin.id, admin.id, null)).rejects.toBeInstanceOf(BusinessError);
    expect((await (await asUser(env, customer)).post(`/admin/users/${admin.id}/disable`)).status).toBe(403);
    expect((await requireUser(env.db, admin.id)).status).toBe("ACTIVE");
  });
});
