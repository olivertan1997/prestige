import { describe, expect, it } from "vitest";
import { reportIssue, updateIssueStatus } from "../src/services/issues";
import type { User } from "../src/types";
import { asUser, ids, newUser, useTestDb } from "./support";

describe("Feature 11: User Admin views reports flagged by users", () => {
  const env = useTestDb();
  const report = async (reporter: User, subject: string) =>
    reportIssue(env.db, reporter.id, { type: "CONTENT", subject, description: `Details for ${subject}` });

  it("The User Admin sees reports from all users", async () => {
    const admin = await newUser(env, "USER_ADMIN");
    const a = await report(await newUser(env, "CUSTOMER"), "Broken image on homepage");
    const b = await report(await newUser(env, "INTERIOR_DESIGNER"), "Cannot upload portfolio");
    const res = await (await asUser(env, admin)).get("/issues/manage");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Broken image on homepage");
    expect(html).toContain("Cannot upload portfolio");
    expect(ids(html, "data-issue")).toEqual(expect.arrayContaining([a.id, b.id]));
  });

  it("Reports can be filtered by status", async () => {
    const admin = await newUser(env, "USER_ADMIN");
    const pending = await report(await newUser(env, "CUSTOMER"), "Still pending");
    const reviewed = await report(await newUser(env, "CUSTOMER"), "Already reviewed");
    await updateIssueStatus(env.db, admin.id, reviewed.id, "REVIEWED", "Looking");
    const html = await (await (await asUser(env, admin)).get("/issues/manage?status=PENDING")).text();
    expect(ids(html, "data-issue")).toContain(pending.id);
    expect(ids(html, "data-issue")).not.toContain(reviewed.id);
    expect(html).not.toContain('data-status="REVIEWED"');
  });

  it("Platform Management can also view reports, customers cannot", async () => {
    await report(await newUser(env, "CUSTOMER"), "Visible to staff");
    expect((await (await asUser(env, await newUser(env, "PLATFORM_MANAGEMENT"))).get("/issues/manage")).status).toBe(200);
    expect((await (await asUser(env, await newUser(env, "CUSTOMER"))).get("/issues/manage")).status).toBe(403);
    expect((await (await asUser(env, await newUser(env, "INTERIOR_DESIGNER"))).get("/issues/manage")).status).toBe(403);
  });
});
