import { describe, expect, it } from "vitest";
import { BusinessError } from "../src/lib/errors";
import { myRating, rateProject, ratingForDesigner, ratingForProject } from "../src/services/projects";
import { asUser, location, newProject, newUser, useTestDb } from "./support";

describe("Feature 5: Rating system as an alternative measure of products and services", () => {
  const env = useTestDb();

  it("A customer rates a project from 1 to 5 stars with a review", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Rate me");
    const res = await (await asUser(env, customer)).post(`/customer/ratings/${project.id}`, { score: "4", comment: "Lovely work" });
    expect(location(res)).toBe(`/projects/${project.id}#reviews`);
    const rating = await myRating(env.db, customer.id, project.id);
    expect(rating?.score).toBe(4);
    expect(rating?.comment).toBe("Lovely work");
  });

  it("Rating again updates the customer's rating instead of adding a second one", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Rate twice");
    await rateProject(env.db, customer.id, project.id, 2, "Meh");
    await rateProject(env.db, customer.id, project.id, 5, "Changed my mind");
    expect(await ratingForProject(env.db, project.id)).toEqual({ average: 5, count: 1 });
  });

  it("Scores outside 1-5 and ratings by non-customers are rejected", async () => {
    const customer = await newUser(env, "CUSTOMER");
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const project = await newProject(env, designer, "Bounds");
    await expect(rateProject(env.db, customer.id, project.id, 0)).rejects.toBeInstanceOf(BusinessError);
    await expect(rateProject(env.db, customer.id, project.id, 6)).rejects.toBeInstanceOf(BusinessError);
    await expect(rateProject(env.db, designer.id, project.id, 5)).rejects.toBeInstanceOf(BusinessError);
  });

  it("Averages are calculated per project and per designer", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const first = await newProject(env, designer, "First");
    const second = await newProject(env, designer, "Second");
    await rateProject(env.db, (await newUser(env, "CUSTOMER")).id, first.id, 5);
    await rateProject(env.db, (await newUser(env, "CUSTOMER")).id, first.id, 4);
    await rateProject(env.db, (await newUser(env, "CUSTOMER")).id, second.id, 3);
    expect((await ratingForProject(env.db, first.id)).average).toBeCloseTo(4.5);
    const byDesigner = await ratingForDesigner(env.db, designer.id);
    expect(byDesigner.average).toBeCloseTo(4.0);
    expect(byDesigner.count).toBe(3);
  });

  it("Platform Management can hide abusive ratings, which then stop counting", async () => {
    const platform = await asUser(env, await newUser(env, "PLATFORM_MANAGEMENT"));
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Moderated");
    await rateProject(env.db, (await newUser(env, "CUSTOMER")).id, project.id, 5, "Great");
    const abusive = await rateProject(env.db, (await newUser(env, "CUSTOMER")).id, project.id, 1, "Spam spam spam");
    expect((await platform.get("/platform/ratings")).status).toBe(200);
    expect(location(await platform.post(`/platform/ratings/${abusive.id}/hide`))).toBe("/platform/ratings");
    expect(await ratingForProject(env.db, project.id)).toEqual({ average: 5, count: 1 });
    expect((await (await asUser(env, await newUser(env, "CUSTOMER"))).get("/platform/ratings")).status).toBe(403);
  });
});
