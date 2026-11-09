import { describe, expect, it } from "vitest";
import { myIssues } from "../src/services/issues";
import { ISSUE_STATUSES } from "../src/types";
import { asUser, browser, location, newUser, useTestDb } from "./support";

describe("Feature 3: Customer reports website issues with Pending / Reviewed / Rectified status", () => {
  const env = useTestDb();

  it("A customer submits a report and it starts as Pending", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const res = await (await asUser(env, customer)).post("/issues", { type: "BUG", subject: "Gallery will not load", description: "The project gallery spins forever" });
    expect(location(res)).toBe("/issues");
    const mine = await myIssues(env.db, customer.id);
    expect(mine).toHaveLength(1);
    expect(mine[0].status).toBe("PENDING");
  });

  it("The customer can follow the status of their reports", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const as = await asUser(env, customer);
    await as.post("/issues", { type: "ACCOUNT", subject: "Cannot change email", description: "Error on save" });
    const res = await as.get("/issues");
    expect(res.status).toBe(200);
    const html = await res.text();
    const [issue] = await myIssues(env.db, customer.id);
    expect(html).toContain("Cannot change email");
    expect(html).toContain(`data-issue="${issue.id}" data-status="PENDING"`);
  });

  it("A report without a subject or description is rejected", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const res = await (await asUser(env, customer)).post("/issues", { type: "BUG", subject: "", description: "" });
    expect(res.status).toBe(422);
    const html = await res.text();
    expect(html).toContain("Subject is required");
    expect(html).toContain("Please describe the issue");
    expect(await myIssues(env.db, customer.id)).toHaveLength(0);
  });

  it("All three statuses exist and visitors must log in to report", async () => {
    expect([...ISSUE_STATUSES]).toEqual(["PENDING", "REVIEWED", "RECTIFIED"]);
    expect(location(await browser(env).get("/issues"))).toBe("/login");
  });
});
