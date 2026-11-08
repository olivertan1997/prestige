import { describe, expect, it } from "vitest";
import { BusinessError } from "../src/lib/errors";
import { getCompany, saveCompany } from "../src/services/catalog";
import { asUser, browser, location, newUser, useTestDb } from "./support";

describe("Spec 2: Interior Designers manage their company information", () => {
  const env = useTestDb();

  it("A designer can create their company information", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const res = await (await asUser(env, designer)).post("/designer/company", {
      name: "Lumen Atelier", registrationNumber: "202400001A", description: "Bright modern homes",
      email: "studio@lumen.example.com", website: "https://lumen.example.com", yearsInBusiness: "7", specialties: "Scandinavian, condos",
    });
    expect(location(res)).toBe("/designer/company");
    const company = await getCompany(env.db, designer.id);
    expect(company?.name).toBe("Lumen Atelier");
    expect(company?.yearsInBusiness).toBe(7);
  });

  it("Saving again updates the same company record", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    await saveCompany(env.db, designer.id, { name: "First Name Studio" });
    await saveCompany(env.db, designer.id, { name: "Second Name Studio", address: "1 Orchard Road" });
    const rows = await env.db.query<{ n: number }>(`select count(*)::int as n from companies where designer_id = $1`, [designer.id]);
    expect(rows[0].n).toBe(1);
    const company = await getCompany(env.db, designer.id);
    expect(company?.name).toBe("Second Name Studio");
    expect(company?.address).toBe("1 Orchard Road");
  });

  it("Company information is shown on the public designer page", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    await saveCompany(env.db, designer.id, { name: "Verdant Interiors Pte Ltd", specialties: "Biophilic design" });
    const res = await browser(env).get(`/designers/${designer.id}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Verdant Interiors Pte Ltd");
    expect(html).toContain("Biophilic design");
  });

  it("Only Interior Designers can manage company information", async () => {
    const customer = await newUser(env, "CUSTOMER");
    expect((await (await asUser(env, customer)).get("/designer/company")).status).toBe(403);
    await expect(saveCompany(env.db, customer.id, { name: "Not allowed" })).rejects.toBeInstanceOf(BusinessError);
  });

  it("Invalid company details are rejected with a message", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const res = await (await asUser(env, designer)).post("/designer/company", { name: "", website: "not-a-url" });
    expect(res.status).toBe(422);
    const html = await res.text();
    expect(html).toContain("Company name is required");
    expect(html).toContain("Website must start with http");
    expect(await getCompany(env.db, designer.id)).toBeNull();
  });
});
