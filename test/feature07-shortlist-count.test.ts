import { describe, expect, it } from "vitest";
import { addFavourite, currentFavouriteCount, getProject, removeFavourite } from "../src/services/projects";
import { asUser, newProject, newUser, useTestDb } from "./support";

describe("Feature 7: Interior Designer sees how many times each IDP was shortlisted", () => {
  const env = useTestDb();

  it("Every customer who saves the project adds one to the shortlist count", async () => {
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Popular");
    for (let i = 0; i < 3; i++) await addFavourite(env.db, (await newUser(env, "CUSTOMER")).id, project.id);
    expect((await getProject(env.db, project.id))?.shortlistCount).toBe(3);
  });

  it("The same customer saving twice is only counted once", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Once");
    await addFavourite(env.db, customer.id, project.id);
    await addFavourite(env.db, customer.id, project.id);
    expect((await getProject(env.db, project.id))?.shortlistCount).toBe(1);
  });

  it("Removing a favourite keeps the historical shortlist count", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "History");
    await addFavourite(env.db, customer.id, project.id);
    await removeFavourite(env.db, customer.id, project.id);
    expect((await getProject(env.db, project.id))?.shortlistCount).toBe(1);
    expect(await currentFavouriteCount(env.db, project.id)).toBe(0);
  });

  it("The designer dashboard shows the shortlist count for each IDP", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const popular = await newProject(env, designer, "Shortlisted twice");
    const quiet = await newProject(env, designer, "Never shortlisted");
    await addFavourite(env.db, (await newUser(env, "CUSTOMER")).id, popular.id);
    await addFavourite(env.db, (await newUser(env, "CUSTOMER")).id, popular.id);
    const res = await (await asUser(env, designer)).get("/designer/dashboard");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(`data-project="${popular.id}" data-views="0" data-shortlists="2" data-favourites="2"`);
    expect(html).toContain(`data-project="${quiet.id}" data-views="0" data-shortlists="0"`);
    expect(html).toContain(`<div class="value" data-total-shortlists>2</div>`);
  });
});
