import { describe, expect, it } from "vitest";
import { BusinessError } from "../src/lib/errors";
import { banUser, requireUser, unbanUser } from "../src/services/users";
import { asUser, browser, location, newProject, newUser, useTestDb } from "./support";

describe("Feature 6: Platform Management bans malicious users such as spam bots", () => {
  const env = useTestDb();

  it("A banned user can no longer log in", async () => {
    const platform = await asUser(env, await newUser(env, "PLATFORM_MANAGEMENT"));
    const spammer = await newUser(env, "CUSTOMER");
    expect((await platform.post(`/platform/users/${spammer.id}/ban`, { reason: "Spam bot" })).status).toBe(302);
    expect((await requireUser(env.db, spammer.id)).status).toBe("BANNED");
    expect(location(await browser(env).loginWithPassword(spammer.username))).toBe("/login?banned");
  });

  it("Banning signs the user out of any open session immediately", async () => {
    const platform = await newUser(env, "PLATFORM_MANAGEMENT");
    const spammer = await newUser(env, "CUSTOMER");
    const session = browser(env);
    expect(location(await session.loginWithPassword(spammer.username))).toBe("/dashboard");
    expect((await session.get("/profile")).status).toBe(200);
    await banUser(env.db, platform.id, spammer.id, "Spam bot");
    expect(location(await session.get("/profile"))).toBe("/login?expired");
  });

  it("Content from banned designers is removed from public view", async () => {
    const platform = await newUser(env, "PLATFORM_MANAGEMENT");
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const project = await newProject(env, designer, "Suspicious listing");
    expect((await browser(env).get(`/projects/${project.id}`)).status).toBe(200);
    await banUser(env.db, platform.id, designer.id, "Fake listings");
    expect((await browser(env).get(`/projects/${project.id}`)).status).toBe(404);
    expect((await browser(env).get(`/designers/${designer.id}`)).status).toBe(404);
  });

  it("Staff cannot be banned, a reason is required, and a ban can be lifted", async () => {
    const platform = await newUser(env, "PLATFORM_MANAGEMENT");
    const admin = await newUser(env, "USER_ADMIN");
    const customer = await newUser(env, "CUSTOMER");
    await expect(banUser(env.db, platform.id, admin.id, "No")).rejects.toBeInstanceOf(BusinessError);
    await expect(banUser(env.db, platform.id, customer.id, " ")).rejects.toBeInstanceOf(BusinessError);
    await banUser(env.db, platform.id, customer.id, "Spam");
    await unbanUser(env.db, customer.id);
    expect((await requireUser(env.db, customer.id)).status).toBe("ACTIVE");
    expect(location(await browser(env).loginWithPassword(customer.username))).toBe("/dashboard");
  });

  it("Only Platform Management can ban users", async () => {
    const admin = await asUser(env, await newUser(env, "USER_ADMIN"));
    const customer = await newUser(env, "CUSTOMER");
    expect((await admin.post(`/platform/users/${customer.id}/ban`, { reason: "x" })).status).toBe(403);
    expect((await requireUser(env.db, customer.id)).status).toBe("ACTIVE");
  });
});
