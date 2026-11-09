import { describe, expect, it } from "vitest";
import { addFavourite, currentFavouriteCount, isFavourite, listFavourites } from "../src/services/projects";
import { asUser, browser, location, newProject, newUser, useTestDb } from "./support";

describe("Feature 4: Customer saves interior design projects to favourites", () => {
  const env = useTestDb();

  it("Saving a project puts it in the customer's favourites", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Favourite me");
    const res = await (await asUser(env, customer)).post(`/customer/favourites/${project.id}`);
    expect(res.status).toBe(302);
    expect(decodeURIComponent(res.headers.getSetCookie().join(";"))).toContain("Saved to your favourites.");
    expect(await isFavourite(env.db, customer.id, project.id)).toBe(true);
    expect((await listFavourites(env.db, customer.id)).map((p) => p.id)).toEqual([project.id]);
  });

  it("Saving the same project twice does not create a duplicate", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Only once");
    expect(await addFavourite(env.db, customer.id, project.id)).toBe(true);
    expect(await addFavourite(env.db, customer.id, project.id)).toBe(false);
    expect(await listFavourites(env.db, customer.id)).toHaveLength(1);
  });

  it("A customer can remove a project from favourites", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Remove me");
    await addFavourite(env.db, customer.id, project.id);
    const res = await (await asUser(env, customer)).post(`/customer/favourites/${project.id}/remove`);
    expect(res.status).toBe(302);
    expect(await listFavourites(env.db, customer.id)).toHaveLength(0);
  });

  it("Only customers can save favourites", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const project = await newProject(env, designer, "Not for designers");
    expect((await (await asUser(env, designer)).post(`/customer/favourites/${project.id}`)).status).toBe(403);
    expect(location(await browser(env).post(`/customer/favourites/${project.id}`))).toBe("/login");
    expect(await currentFavouriteCount(env.db, project.id)).toBe(0);
  });
});
