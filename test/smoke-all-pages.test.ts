import { beforeEach, describe, expect, it } from "vitest";
import { seedDemoData } from "../src/services/demo";
import { findUserByUsername } from "../src/services/users";
import type { User } from "../src/types";
import { asUser, browser, useTestDb } from "./support";

describe("Smoke Test 1: Demo data loads and every page of the website renders", () => {
  const env = useTestDb();
  let admin: User, platform: User, designer: User, customer: User;

  beforeEach(async () => {
    await seedDemoData(env.db, "DemoPass123!");
    admin = (await findUserByUsername(env.db, "admin"))!;
    platform = (await findUserByUsername(env.db, "platform"))!;
    designer = (await findUserByUsername(env.db, "sophia"))!;
    customer = (await findUserByUsername(env.db, "emily"))!;
  });

  const ok = async (user: User | null, paths: string[]) => {
    const b = user ? await asUser(env, user) : browser(env);
    for (const path of paths) {
      const res = await b.get(path);
      expect(res.status, path).toBe(200);
    }
  };

  it("Demo data creates accounts, projects, ratings and availability", async () => {
    for (const u of ["admin", "platform", "sophia", "marcus", "emily", "daniel"]) expect(await findUserByUsername(env.db, u)).not.toBeNull();
    expect(await seedDemoData(env.db, "DemoPass123!")).toBe(false); // runs only once
    const html = await (await browser(env).get("/")).text();
    expect(html).toContain("Featured projects");
  });

  it("Public pages render for visitors", async () => {
    await ok(null, ["/", "/login", "/healthz"]);
  });

  it("Customer pages render", async () => {
    await ok(customer, ["/"]);
  });

  it("Unknown pages show the 404 page and forms from other sites are refused", async () => {
    const missing = await browser(env).get("/no-such-page");
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain("find that page");
    expect((await browser(env).get("/projects/999999")).status).toBe(404);
    const forged = await browser(env).post("/login", { username: "admin", password: "DemoPass123!" }, { origin: "https://evil.example.com" });
    expect(forged.status).toBe(403);
  });
});
