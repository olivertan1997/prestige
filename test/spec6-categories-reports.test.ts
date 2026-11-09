import { describe, expect, it } from "vitest";
import { BusinessError } from "../src/lib/errors";
import { todayLocal } from "../src/lib/dates";
import { createCategory, deleteCategory, getCategory, listActiveCategories, listCategories, toggleCategory } from "../src/services/catalog";
import { reportIssue } from "../src/services/issues";
import { addFavourite, rateProject, recordView } from "../src/services/projects";
import { generateReport } from "../src/services/reports";
import { PERIODS, PERIOD_INFO } from "../src/types";
import { asUser, location, newCategory, newProject, newUser, next, useTestDb } from "./support";

describe("Spec 6: Platform Management manages IDP categories and gets daily, weekly and monthly reports", () => {
  const env = useTestDb();

  it("Platform Management can create, rename and deactivate a category", async () => {
    const platform = await asUser(env, await newUser(env, "PLATFORM_MANAGEMENT"));
    const name = `Balcony ${next()}`;
    expect(location(await platform.post("/platform/categories", { name, description: "Outdoor" }))).toBe("/platform/categories");
    const category = (await listCategories(env.db)).find((c) => c.name === name)!;
    expect(location(await platform.post(`/platform/categories/${category.id}`, { name: `${name} & Outdoor`, description: "Balconies and gardens" }))).toBe("/platform/categories");
    expect(location(await platform.post(`/platform/categories/${category.id}/toggle`))).toBe("/platform/categories");
    const updated = await getCategory(env.db, category.id);
    expect(updated.name).toBe(`${name} & Outdoor`);
    expect(updated.active).toBe(false);
    expect((await listActiveCategories(env.db)).map((c) => c.id)).not.toContain(category.id);
  });

  it("A category in use cannot be deleted, an unused one can", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const used = await newCategory(env, "Used");
    await newProject(env, designer, "Uses category", { category: used });
    await expect(deleteCategory(env.db, used.id)).rejects.toBeInstanceOf(BusinessError);
    const unused = await newCategory(env, "Unused");
    await deleteCategory(env.db, unused.id);
    expect((await listCategories(env.db)).map((c) => c.id)).not.toContain(unused.id);
    await expect(createCategory(env.db, used.name)).rejects.toBeInstanceOf(BusinessError);
  });

  it("Inactive categories cannot be used for new projects", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const category = await newCategory(env, "Retired");
    await toggleCategory(env.db, category.id);
    await expect(newProject(env, designer, "Should fail", { category })).rejects.toBeInstanceOf(BusinessError);
  });

  it("Daily, weekly and monthly reports count today's activity", async () => {
    const before = await Promise.all(PERIODS.map((p) => generateReport(env.db, p)));
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const customer = await newUser(env, "CUSTOMER");
    const project = await newProject(env, designer, "Report project");
    await recordView(env.db, project.id, customer.id);
    await recordView(env.db, project.id, null);
    await addFavourite(env.db, customer.id, project.id);
    await rateProject(env.db, customer.id, project.id, 5, "Great");
    await reportIssue(env.db, customer.id, { type: "BUG", subject: "Report test", description: "Something broke" });

    for (const old of before) {
      const report = await generateReport(env.db, old.period);
      const now = report.current;
      expect(now.start <= todayLocal() && todayLocal() < now.end).toBe(true);
      expect(now.newUsers - old.current.newUsers).toBe(2);
      expect(now.newProjects - old.current.newProjects).toBe(1);
      expect(now.views - old.current.views).toBe(2);
      expect(now.shortlists - old.current.shortlists).toBe(1);
      expect(now.ratings - old.current.ratings).toBe(1);
      expect(now.issues - old.current.issues).toBe(1);
      expect(report.rows).toHaveLength(PERIOD_INFO[old.period].periods);
    }
    expect((await generateReport(env.db, "DAILY")).topViewed.map((r) => r.id)).toContain(project.id);
  });

  it("Reports page and CSV export are available to Platform Management only", async () => {
    const platform = await asUser(env, await newUser(env, "PLATFORM_MANAGEMENT"));
    for (const period of PERIODS) {
      const res = await platform.get(`/platform/reports?period=${period}`);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain(`${PERIOD_INFO[period].label} report`);
    }
    const csv = await platform.get("/platform/reports/export?period=MONTHLY");
    expect(csv.status).toBe(200);
    expect(csv.headers.get("content-type")).toContain("text/csv");
    expect(await csv.text()).toContain("Period,Start,End (exclusive),New users");
    expect((await (await asUser(env, await newUser(env, "CUSTOMER"))).get("/platform/reports")).status).toBe(403);
  });
});
