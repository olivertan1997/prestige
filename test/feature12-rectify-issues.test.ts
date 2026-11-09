import { describe, expect, it } from "vitest";
import { getIssue, reportIssue, updateIssueStatus } from "../src/services/issues";
import type { User } from "../src/types";
import { asUser, newUser, useTestDb } from "./support";

describe("Feature 12: User Admin changes the status of reported issues to Rectified", () => {
  const env = useTestDb();
  const report = (reporter: User) =>
    reportIssue(env.db, reporter.id, { type: "BUG", subject: "Search button does nothing", description: "Clicking search on mobile has no effect" });

  it("The User Admin marks a report as Rectified", async () => {
    const admin = await newUser(env, "USER_ADMIN");
    const issue = await report(await newUser(env, "CUSTOMER"));
    const res = await (await asUser(env, admin)).post(`/issues/manage/${issue.id}/status`, { status: "RECTIFIED", note: "Fixed in today's update" });
    expect(res.status).toBe(302);
    const updated = (await getIssue(env.db, issue.id))!;
    expect(updated.status).toBe("RECTIFIED");
    expect(updated.resolvedAt).not.toBeNull();
    expect(updated.handledById).toBe(admin.id);
    expect(updated.resolutionNote).toBe("Fixed in today's update");
  });

  it("The reporter can see that their issue was rectified", async () => {
    const admin = await newUser(env, "USER_ADMIN");
    const customer = await newUser(env, "CUSTOMER");
    const issue = await report(customer);
    await updateIssueStatus(env.db, admin.id, issue.id, "RECTIFIED", "All sorted now");
    const res = await (await asUser(env, customer)).get("/issues");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("All sorted now");
    expect(html).toContain(`data-issue="${issue.id}" data-status="RECTIFIED"`);
  });

  it("A report can move Pending -> Reviewed -> Rectified", async () => {
    const admin = await newUser(env, "USER_ADMIN");
    const issue = await report(await newUser(env, "CUSTOMER"));
    expect(issue.status).toBe("PENDING");
    expect((await updateIssueStatus(env.db, admin.id, issue.id, "REVIEWED")).status).toBe("REVIEWED");
    const done = await updateIssueStatus(env.db, admin.id, issue.id, "RECTIFIED");
    expect(done.status).toBe("RECTIFIED");
    expect(done.resolvedAt).not.toBeNull();
  });

  it("Customers cannot change the status of reports", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const issue = await report(customer);
    expect((await (await asUser(env, customer)).post(`/issues/manage/${issue.id}/status`, { status: "RECTIFIED" })).status).toBe(403);
    expect((await getIssue(env.db, issue.id))?.status).toBe("PENDING");
  });
});
