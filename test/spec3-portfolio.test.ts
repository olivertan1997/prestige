import { describe, expect, it } from "vitest";
import { BusinessError } from "../src/lib/errors";
import { addFavourite, createProject, currentFavouriteCount, getProject, listDesignerProjects, updateProject } from "../src/services/projects";
import { asUser, browser, location, newCategory, newProject, newUser, useTestDb } from "./support";

describe("Spec 3: Interior Designers manage a portfolio of current and past IDPs", () => {
  const env = useTestDb();

  it("A designer can add both current and past projects", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const category = await newCategory(env, "Kitchen");
    const as = await asUser(env, designer);
    expect(location(await as.post("/designer/projects", { title: "Ongoing Kitchen", categoryId: String(category.id), status: "CURRENT", budget: "25000", startDate: "2026-01-10" })))
      .toBe("/designer/projects");
    expect(location(await as.post("/designer/projects", { title: "Finished Kitchen", categoryId: String(category.id), status: "PAST", startDate: "2025-01-10", endDate: "2025-04-30" })))
      .toBe("/designer/projects");
    const portfolio = await listDesignerProjects(env.db, designer.id);
    expect(portfolio.map((p) => p.status).sort()).toEqual(["CURRENT", "PAST"]);
    expect(portfolio.find((p) => p.title === "Ongoing Kitchen")?.budget).toBe(25000);
    expect((await as.get("/designer/projects")).status).toBe(200);
  });

  it("A designer can edit a project, e.g. move it from current to past", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const project = await newProject(env, designer, "Before edit");
    const res = await (await asUser(env, designer)).post(`/designer/projects/${project.id}`, {
      title: "After edit", categoryId: String(project.categoryId), status: "PAST", endDate: "2026-02-01",
    });
    expect(location(res)).toBe("/designer/projects");
    const updated = await getProject(env.db, project.id);
    expect(updated?.title).toBe("After edit");
    expect(updated?.status).toBe("PAST");
  });

  it("A designer can delete a project together with its favourites", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const customer = await newUser(env, "CUSTOMER");
    const project = await newProject(env, designer, "To be deleted");
    await addFavourite(env.db, customer.id, project.id);
    const res = await (await asUser(env, designer)).post(`/designer/projects/${project.id}/delete`);
    expect(location(res)).toBe("/designer/projects");
    expect(await getProject(env.db, project.id)).toBeNull();
    expect(await currentFavouriteCount(env.db, project.id)).toBe(0);
  });

  it("A designer cannot change another designer's project", async () => {
    const owner = await newUser(env, "INTERIOR_DESIGNER");
    const other = await newUser(env, "INTERIOR_DESIGNER");
    const project = await newProject(env, owner, "Owner's project");
    await expect(updateProject(env.db, other.id, project.id, { title: "Hijacked", categoryId: String(project.categoryId), status: "CURRENT" }))
      .rejects.toBeInstanceOf(BusinessError);
    const res = await (await asUser(env, other)).post(`/designer/projects/${project.id}/delete`);
    expect(res.status).toBe(302);
    expect(res.headers.getSetCookie().join(";")).toContain("pid_flash");
    expect(await getProject(env.db, project.id)).not.toBeNull();
  });

  it("A project whose end date is before its start date is rejected", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const category = await newCategory(env, "Bedroom");
    await expect(createProject(env.db, designer.id, { title: "Time travel", categoryId: String(category.id), status: "PAST", startDate: "2026-05-01", endDate: "2026-04-01" }))
      .rejects.toBeInstanceOf(BusinessError);
    const res = await (await asUser(env, designer)).post("/designer/projects", { title: "Time travel", categoryId: String(category.id), status: "PAST", startDate: "2026-05-01", endDate: "2026-04-01" });
    expect(res.status).toBe(422);
    expect(await res.text()).toContain("The end date cannot be before the start date");
  });
});
