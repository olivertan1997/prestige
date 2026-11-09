import { describe, expect, it } from "vitest";
import { createUser } from "../src/services/users";
import type { User } from "../src/types";
import { PASSWORD, asUser, ids, newUser, next, useTestDb } from "./support";

describe("Feature 8: Search users by name to quickly find a specific account", () => {
  const env = useTestDb();
  const listed = async (viewer: User, path: string) => {
    const res = await (await asUser(env, viewer)).get(path);
    expect(res.status).toBe(200);
    return ids(await res.text(), "data-user");
  };

  it("Partial, case-insensitive name search finds the account", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const target = await newUser(env, "CUSTOMER", "Bartholomew Quince");
    await newUser(env, "CUSTOMER", "Someone Else");
    expect(await listed(designer, "/designer/users?q=THOLOMEW")).toEqual([target.id]);
    expect(await listed(designer, "/designer/users?q=quince")).toEqual([target.id]);
  });

  it("Searching by username also works", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const target = await newUser(env, "CUSTOMER");
    expect(await listed(designer, `/designer/users?q=${target.username}`)).toContain(target.id);
  });

  it("Interior Designers see customers' email addresses and phone numbers, but not other users'", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER", "Directory Viewer");
    const n = next();
    await createUser(env.db, {
      username: `contact.customer${n}`, email: `contact.me${n}@test.example.com`, fullName: "Contactable Customer", password: PASSWORD,
      role: "CUSTOMER", phone: "+65 9123 4567",
    });
    const noPhone = await newUser(env, "CUSTOMER", "Customer Without Phone");
    const otherDesigner = await newUser(env, "INTERIOR_DESIGNER", "Other Designer");
    const admin = await newUser(env, "USER_ADMIN");
    const html = await (await (await asUser(env, designer)).get("/designer/users")).text();
    expect(html).toContain(`<a href="mailto:contact.me${n}@test.example.com" data-email>contact.me${n}@test.example.com</a>`);
    expect(html).toContain(`<a href="tel:+6591234567" data-phone>+65 9123 4567</a>`);
    expect(html).toContain(noPhone.email);
    expect(html).toContain("Not given");
    for (const hidden of [designer, otherDesigner, admin]) expect(html).not.toContain(hidden.email);
    const filtered = await (await (await asUser(env, designer)).get("/designer/users?q=contactable")).text();
    expect(filtered).toContain("+65 9123 4567");
  });

  it("A name with no matches returns an empty list", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    expect(await listed(designer, "/designer/users?q=zzzz-no-such-person")).toEqual([]);
  });
});
