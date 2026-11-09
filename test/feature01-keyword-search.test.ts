import { describe, expect, it } from "vitest";
import { searchProjects } from "../src/services/projects";
import { banUser } from "../src/services/users";
import { browser, newCategory, newProject, newUser, useTestDb } from "./support";

describe("Feature 1: Customer searches interior design projects using keywords", () => {
  const env = useTestDb();
  const search = async (q: string) => (await searchProjects(env.db, { q })).items.map((p) => p.id);

  it("Keywords match title, description, style and category - ignoring case", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const category = await newCategory(env, "Xylophonic Lounge");
    const byTitle = await newProject(env, designer, "Wombatine Penthouse", { category, description: "Plain description", status: "PAST" });
    const byDescription = await newProject(env, designer, "Plain title", { category, description: "Uses glimmerstone tiles" });
    expect(await search("WOMBATINE")).toContain(byTitle.id);
    expect(await search("WOMBATINE")).not.toContain(byDescription.id);
    expect(await search("glimmerstone")).toEqual([byDescription.id]);
    expect(await search("xylophonic")).toEqual(expect.arrayContaining([byTitle.id, byDescription.id]));
    expect(await search("modern")).toEqual(expect.arrayContaining([byTitle.id, byDescription.id])); // style
  });

  it("All words of a multi-word search must match", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const both = await newProject(env, designer, "Zanzibar Japandi Kitchen");
    const one = await newProject(env, designer, "Zanzibar Industrial Loft");
    const found = await search("zanzibar japandi");
    expect(found).toContain(both.id);
    expect(found).not.toContain(one.id);
  });

  it("A search with no matches shows a friendly empty result", async () => {
    expect(await search("qwertyuiopnothingmatches")).toEqual([]);
    const res = await browser(env).get("/projects?q=qwertyuiopnothingmatches");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("No projects match your search");
  });

  it("Search can be combined with category and current/past filters", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const a = await newCategory(env, "Alpha");
    const b = await newCategory(env, "Beta");
    const current = await newProject(env, designer, "Pelican Current", { category: a });
    const past = await newProject(env, designer, "Pelican Past", { category: b, status: "PAST" });
    expect((await searchProjects(env.db, { q: "pelican", categoryId: a.id })).items.map((p) => p.id)).toEqual([current.id]);
    expect((await searchProjects(env.db, { q: "pelican", status: "PAST" })).items.map((p) => p.id)).toEqual([past.id]);
  });

  it("Projects of banned designers do not appear in search results", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const platform = await newUser(env, "PLATFORM_MANAGEMENT");
    const project = await newProject(env, designer, "Flamingo Spam Listing");
    expect(await search("flamingo")).toContain(project.id);
    await banUser(env.db, platform.id, designer.id, "Spam");
    expect(await search("flamingo")).not.toContain(project.id);
  });
});
