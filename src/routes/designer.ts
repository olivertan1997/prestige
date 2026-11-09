// Interior Designer workspace: specs 2, 3, 5 and stories 2, 7, 8, 9.
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { pageCtx } from "../lib/context";
import { parseMonth } from "../lib/dates";
import { BusinessError } from "../lib/errors";
import { backPath, intParam, readForm, setFlash } from "../lib/http";
import { addSlot, buildCalendar, deleteSlot, toggleSlot, upcomingSlots, validateSlot } from "../services/availability";
import { getCategory, getCompany, listActiveCategories, saveCompany, validateCompany } from "../services/catalog";
import {
  createProject,
  deleteProject,
  getOwnedProject,
  listDesignerProjects,
  statsForDesigner,
  updateProject,
  validateProject,
} from "../services/projects";
import { userDirectory } from "../services/users";
import type { Category, Company, Project } from "../types";
import { emptyForm, type FormState } from "../views/components";
import { availabilityPage, companyPage, dashboardPage, directoryPage, portfolioPage, projectFormPage } from "../views/designer";

export const designerRoutes = new Hono<AppEnv>();

// --------------------------------------------------------------- dashboard

designerRoutes.get("/dashboard", async (c) => {
  const db = c.get("db");
  const id = c.get("user")!.id;
  const [stats, company, slots] = await Promise.all([statsForDesigner(db, id), getCompany(db, id), upcomingSlots(db, id)]);
  return c.html(dashboardPage(pageCtx(c), { stats, hasCompany: !!company, upcomingSlots: slots.length }));
});
designerRoutes.get("/", (c) => c.redirect("/designer/dashboard"));

// ----------------------------------------------------------------- company

const companyValues = (co: Company | null): Record<string, string | null> => ({
  name: co?.name ?? "",
  registrationNumber: co?.registrationNumber ?? null,
  description: co?.description ?? null,
  address: co?.address ?? null,
  phone: co?.phone ?? null,
  email: co?.email ?? null,
  website: co?.website ?? null,
  yearsInBusiness: co?.yearsInBusiness === null || co?.yearsInBusiness === undefined ? null : String(co.yearsInBusiness),
  specialties: co?.specialties ?? null,
});

designerRoutes.get("/company", async (c) => {
  const company = await getCompany(c.get("db"), c.get("user")!.id);
  return c.html(companyPage(pageCtx(c), emptyForm(companyValues(company)), !!company));
});

designerRoutes.post("/company", async (c) => {
  const db = c.get("db");
  const id = c.get("user")!.id;
  const values = await readForm(c);
  const f: FormState = { values, errors: validateCompany(values) };
  if (!Object.keys(f.errors).length) {
    await saveCompany(db, id, values);
    setFlash(c, "success", "Company information saved.");
    return c.redirect("/designer/company");
  }
  return c.html(companyPage(pageCtx(c), f, !!(await getCompany(db, id))), 422);
});

// --------------------------------------------------------------- portfolio

designerRoutes.get("/projects", async (c) => {
  return c.html(portfolioPage(pageCtx(c), await listDesignerProjects(c.get("db"), c.get("user")!.id)));
});

async function categoriesFor(db: AppEnv["Variables"]["db"], project: Project | null): Promise<Category[]> {
  const categories = await listActiveCategories(db);
  if (project?.categoryId && project.categoryActive === false) categories.push(await getCategory(db, project.categoryId));
  return categories;
}

const projectValues = (p: Project): Record<string, string | null> => ({
  title: p.title,
  description: p.description,
  categoryId: p.categoryId === null ? "" : String(p.categoryId),
  style: p.style,
  location: p.location,
  budget: p.budget === null ? null : String(p.budget),
  status: p.status,
  startDate: p.startDate,
  endDate: p.endDate,
  imageUrl: p.imageUrl,
});

designerRoutes.get("/projects/new", async (c) => {
  return c.html(projectFormPage(pageCtx(c), emptyForm({ status: "CURRENT" }), await categoriesFor(c.get("db"), null), null));
});

designerRoutes.post("/projects", async (c) => {
  const db = c.get("db");
  const values = await readForm(c);
  const f: FormState = { values, errors: validateProject(values) };
  if (!Object.keys(f.errors).length) {
    try {
      const project = await createProject(db, c.get("user")!.id, values);
      setFlash(c, "success", `'${project.title}' was added to your portfolio.`);
      return c.redirect("/designer/projects");
    } catch (e) {
      if (!(e instanceof BusinessError)) throw e;
      f.global = e.message;
    }
  }
  return c.html(projectFormPage(pageCtx(c), f, await categoriesFor(db, null), null), 422);
});

designerRoutes.get("/projects/:id/edit", async (c) => {
  const db = c.get("db");
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const project = await getOwnedProject(db, c.get("user")!.id, id);
  return c.html(projectFormPage(pageCtx(c), emptyForm(projectValues(project)), await categoriesFor(db, project), id));
});

designerRoutes.post("/projects/:id", async (c) => {
  const db = c.get("db");
  const me = c.get("user")!.id;
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const project = await getOwnedProject(db, me, id);
  const values = await readForm(c);
  const f: FormState = { values, errors: validateProject(values) };
  if (!Object.keys(f.errors).length) {
    try {
      await updateProject(db, me, id, values);
      setFlash(c, "success", "Project updated.");
      return c.redirect("/designer/projects");
    } catch (e) {
      if (!(e instanceof BusinessError)) throw e;
      f.global = e.message;
    }
  }
  return c.html(projectFormPage(pageCtx(c), f, await categoriesFor(db, project), id), 422);
});

designerRoutes.post("/projects/:id/delete", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  await deleteProject(c.get("db"), c.get("user")!.id, id);
  setFlash(c, "success", "Project deleted.");
  return c.redirect("/designer/projects");
});

// ------------------------------------------------------------ availability

designerRoutes.get("/availability", async (c) => {
  const db = c.get("db");
  const id = c.get("user")!.id;
  const [cal, upcoming] = await Promise.all([buildCalendar(db, id, parseMonth(c.req.query("month"))), upcomingSlots(db, id)]);
  return c.html(availabilityPage(pageCtx(c), cal, upcoming, emptyForm()));
});

designerRoutes.post("/availability", async (c) => {
  const db = c.get("db");
  const id = c.get("user")!.id;
  const values = await readForm(c);
  const f: FormState = { values, errors: validateSlot(values) };
  if (!Object.keys(f.errors).length) {
    try {
      const slot = await addSlot(db, id, values);
      setFlash(c, "success", "Availability added.");
      return c.redirect(`/designer/availability?month=${slot.date.slice(0, 7)}`);
    } catch (e) {
      if (!(e instanceof BusinessError)) throw e;
      f.global = e.message;
    }
  }
  const month = parseMonth((values.date ?? "").slice(0, 7));
  const [cal, upcoming] = await Promise.all([buildCalendar(db, id, month), upcomingSlots(db, id)]);
  return c.html(availabilityPage(pageCtx(c), cal, upcoming, f), 422);
});

designerRoutes.post("/availability/:id/toggle", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  await toggleSlot(c.get("db"), c.get("user")!.id, id);
  setFlash(c, "success", "Slot updated.");
  return c.redirect(backPath(c, "/designer/availability"));
});

designerRoutes.post("/availability/:id/delete", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  await deleteSlot(c.get("db"), c.get("user")!.id, id);
  setFlash(c, "success", "Slot removed.");
  return c.redirect(backPath(c, "/designer/availability"));
});

// ------------------------------------------------- user directory (stories 8 + 9)

designerRoutes.get("/users", async (c) => {
  const q = c.req.query("q") ?? "";
  const role = c.req.query("role") ?? "";
  return c.html(directoryPage(pageCtx(c), await userDirectory(c.get("db"), q, role), q, role));
});
