import { describe, expect, it } from "vitest";
import { asUser, location, newProject, newUser, useTestDb } from "./support";

describe("Spec 4: Customers search, view and save IDPs into a favourites list", () => {
  const env = useTestDb();

  it("A customer can search for projects", async () => {
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Quokka Terrace Garden Flat");
    const res = await (await asUser(env, await newUser(env, "CUSTOMER"))).get("/projects?q=quokka");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Quokka Terrace Garden Flat");
    expect(html).toContain(`href="/projects/${project.id}"`);
  });

  it("A customer can view a project's details page", async () => {
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Marmalade Loft Makeover");
    const res = await (await asUser(env, await newUser(env, "CUSTOMER"))).get(`/projects/${project.id}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Marmalade Loft Makeover");
    expect(html).toContain("Save to favourites");
  });

  it("A customer can save a project and find it in their favourites list", async () => {
    const project = await newProject(env, await newUser(env, "INTERIOR_DESIGNER"), "Saffron Courtyard House");
    const customer = await asUser(env, await newUser(env, "CUSTOMER"));
    const saved = await customer.post(`/customer/favourites/${project.id}`);
    expect(saved.status).toBe(302);
    expect(location(saved)).toBe(`/projects/${project.id}`);
    const list = await customer.get("/customer/favourites");
    expect(list.status).toBe(200);
    expect(await list.text()).toContain("Saffron Courtyard House");
  });
});
