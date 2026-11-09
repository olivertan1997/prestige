import { describe, expect, it } from "vitest";
import { disableUser, getUser } from "../src/services/users";
import { ROLES, type User } from "../src/types";
import { asUser, ids, newUser, useTestDb } from "./support";

describe("Feature 9: Filter users by role to quickly find a specific account", () => {
  const env = useTestDb();
  const listed = async (viewer: User, path: string) => {
    const res = await (await asUser(env, viewer)).get(path);
    expect(res.status).toBe(200);
    const users = await Promise.all(ids(await res.text(), "data-user").map((id) => getUser(env.db, id)));
    return users.map((u) => u!);
  };

  it("Filtering by a role returns only accounts with that role", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    for (const role of ROLES) await newUser(env, role);
    for (const role of ROLES) {
      const found = await listed(designer, `/designer/users?role=${role}`);
      expect(found.length).toBeGreaterThan(0);
      expect(found.every((u) => u.role === role)).toBe(true);
    }
  });

  it("Name search and role filter can be combined", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const customer = await newUser(env, "CUSTOMER", "Ophelia Marigold");
    const otherDesigner = await newUser(env, "INTERIOR_DESIGNER", "Ophelia Lantern");
    expect((await listed(designer, "/designer/users?q=ophelia&role=CUSTOMER")).map((u) => u.id)).toEqual([customer.id]);
    expect((await listed(designer, "/designer/users?q=ophelia&role=INTERIOR_DESIGNER")).map((u) => u.id)).toEqual([otherDesigner.id]);
  });

  it("Without a role filter every role is listed", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    for (const role of ROLES) await newUser(env, role);
    const roles = new Set((await listed(designer, "/designer/users")).map((u) => u.role));
    expect([...roles].sort()).toEqual([...ROLES].sort());
  });

  it("User Admin can filter by role and account status together", async () => {
    const admin = await newUser(env, "USER_ADMIN");
    const disabled = await newUser(env, "CUSTOMER");
    await newUser(env, "CUSTOMER");
    await disableUser(env.db, admin.id, disabled.id, "Testing");
    const found = await listed(admin, "/admin/users?role=CUSTOMER&status=DISABLED");
    expect(found.map((u) => u.id)).toEqual([disabled.id]);
  });
});
