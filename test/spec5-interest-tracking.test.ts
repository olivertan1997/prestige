import { describe, expect, it } from "vitest";
import { addFavourite, getProject, statsForDesigner } from "../src/services/projects";
import { asUser, browser, newProject, newUser, useTestDb } from "./support";

describe("Spec 5: Interior Designers track interest in their IDPs (views and shortlists)", () => {
  const env = useTestDb();

  it("Each visitor viewing a project increases its view count", async () => {
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Counted views");
    expect((await browser(env).get(`/projects/${project.id}`)).status).toBe(200);
    expect((await browser(env).get(`/projects/${project.id}`)).status).toBe(200);
    expect((await (await asUser(env, await newUser(env, "CUSTOMER"))).get(`/projects/${project.id}`)).status).toBe(200);
    expect((await getProject(env.db, project.id))?.viewCount).toBe(3);
  });

  it("Refreshing the page in the same session only counts one view", async () => {
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Refresh test");
    const visitor = browser(env);
    for (let i = 0; i < 4; i++) expect((await visitor.get(`/projects/${project.id}`)).status).toBe(200);
    expect((await getProject(env.db, project.id))?.viewCount).toBe(1);
  });

  it("A designer viewing their own project is not counted", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const project = await newProject(env, designer, "Own project");
    expect((await (await asUser(env, designer)).get(`/projects/${project.id}`)).status).toBe(200);
    expect((await getProject(env.db, project.id))?.viewCount).toBe(0);
  });

  it("The designer dashboard shows views and shortlists per project", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const project = await newProject(env, designer, "Dashboard project");
    await browser(env).get(`/projects/${project.id}`);
    await addFavourite(env.db, (await newUser(env, "CUSTOMER")).id, project.id);

    const res = await (await asUser(env, designer)).get("/designer/dashboard");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(`data-project="${project.id}" data-views="1" data-shortlists="1"`);
    const row = (await statsForDesigner(env.db, designer.id)).find((s) => s.id === project.id)!;
    expect(row.views30).toBe(1);
    expect(row.shortlists30).toBe(1);
  });
});
