import { describe, expect, it } from "vitest";
import { BusinessError } from "../src/lib/errors";
import { findUserByUsername, listProfiles, registerUser, updateProfile, createUser } from "../src/services/users";
import { PASSWORD, asUser, browser, location, newUser, next, useTestDb } from "./support";

describe("Spec 1: Manage user accounts and user profiles (User Admin, Interior Designer, Customer, Platform Management)", () => {
  const env = useTestDb();

  it("Visitors can register as a Customer or an Interior Designer", async () => {
    const n = next();
    for (const [username, role] of [[`newcustomer${n}`, "CUSTOMER"], [`newdesigner${n}`, "INTERIOR_DESIGNER"]]) {
      const res = await browser(env).post("/register", {
        username, email: `${username}@test.example.com`, fullName: "New Person", password: PASSWORD, confirmPassword: PASSWORD, role,
      });
      expect(res.status).toBe(302);
      expect(location(res)).toBe("/login");
      expect((await findUserByUsername(env.db, username))?.role).toBe(role);
    }
  });

  it("Staff accounts cannot be self-registered and duplicate usernames are rejected", async () => {
    const u = `sneaky${next()}`;
    await expect(registerUser(env.db, { username: u, email: `${u}@x.com`, fullName: "Sneaky", password: PASSWORD, role: "USER_ADMIN" }))
      .rejects.toBeInstanceOf(BusinessError);
    const existing = await newUser(env, "CUSTOMER");
    await expect(createUser(env.db, { username: existing.username, email: `other${next()}@x.com`, fullName: "Copy", password: PASSWORD, role: "CUSTOMER" }))
      .rejects.toBeInstanceOf(BusinessError);
    const res = await browser(env).post("/register", { username: u, email: `${u}@x.com`, fullName: "Sneaky", password: PASSWORD, confirmPassword: PASSWORD, role: "USER_ADMIN" });
    expect(res.status).toBe(422);
    expect(await findUserByUsername(env.db, u)).toBeNull();
  });

  it("User Admin can create, view and update accounts of every type", async () => {
    const admin = await asUser(env, await newUser(env, "USER_ADMIN"));
    const username = `platform${next()}`;
    const created = await admin.post("/admin/users", { username, email: `${username}@x.com`, fullName: "Platform Person", role: "PLATFORM_MANAGEMENT", password: PASSWORD });
    expect(location(created)).toBe("/admin/users");
    const user = (await findUserByUsername(env.db, username))!;
    expect(user.role).toBe("PLATFORM_MANAGEMENT");

    expect((await admin.get(`/admin/users/${user.id}/edit`)).status).toBe(200);
    const updated = await admin.post(`/admin/users/${user.id}`, { email: `${username}@x.com`, fullName: "Renamed Person", role: "PLATFORM_MANAGEMENT", phone: "+65 8000 0000" });
    expect(location(updated)).toBe(`/admin/users/${user.id}/edit`);
    const after = (await findUserByUsername(env.db, username))!;
    expect(after.fullName).toBe("Renamed Person");
    expect(after.phone).toBe("+65 8000 0000");
  });

  it("Every user can edit their own profile", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const res = await (await asUser(env, customer)).post("/profile", {
      fullName: "Updated Name", email: `updated${next()}@x.com`, phone: "91234567", bio: "I love Japandi interiors",
    });
    expect(location(res)).toBe("/profile");
    const after = (await findUserByUsername(env.db, customer.username))!;
    expect(after.fullName).toBe("Updated Name");
    expect(after.bio).toBe("I love Japandi interiors");
  });

  it("All four user profiles exist and a suspended profile blocks login", async () => {
    const profiles = await listProfiles(env.db);
    expect(profiles.map((p) => p.role).sort()).toEqual(["CUSTOMER", "INTERIOR_DESIGNER", "PLATFORM_MANAGEMENT", "USER_ADMIN"]);
    const customer = await newUser(env, "CUSTOMER");
    const customerProfile = profiles.find((p) => p.role === "CUSTOMER")!;

    await updateProfile(env.db, customerProfile.id, "Customer", "Paused for maintenance", false);
    expect(location(await browser(env).loginWithPassword(customer.username))).toBe("/login?disabled");

    await updateProfile(env.db, customerProfile.id, "Customer", "Back again", true);
    expect(location(await browser(env).loginWithPassword(customer.username))).toBe("/dashboard");

    const adminProfile = profiles.find((p) => p.role === "USER_ADMIN")!;
    await expect(updateProfile(env.db, adminProfile.id, "User Admin", null, false)).rejects.toBeInstanceOf(BusinessError);
  });

  it("Each account type can only open its own workspace", async () => {
    const customer = await asUser(env, await newUser(env, "CUSTOMER"));
    const designer = await asUser(env, await newUser(env, "INTERIOR_DESIGNER"));
    expect((await customer.get("/admin/users")).status).toBe(403);
    expect((await designer.get("/platform/reports")).status).toBe(403);
    expect((await customer.get("/designer/dashboard")).status).toBe(403);
    expect((await designer.get("/designer/dashboard")).status).toBe(200);
    expect(location(await browser(env).get("/admin/users"))).toBe("/login");
  });
});
