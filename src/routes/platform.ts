// Platform Management workspace: spec 6 and stories 5 and 6.
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { pageCtx } from "../lib/context";
import { todayLocal } from "../lib/dates";
import { BusinessError, clean } from "../lib/errors";
import { backPath, intParam, readForm, setFlash, type Ctx } from "../lib/http";
import { categoryUsage, createCategory, deleteCategory, listCategories, toggleCategory, updateCategory } from "../services/catalog";
import { allRatings, deleteRating, ratingForPlatform, setRatingVisible, topRatedProjects } from "../services/projects";
import { generateReport, parsePeriod, reportToCsv } from "../services/reports";
import { banUser, searchUsers, unbanUser } from "../services/users";
import { emptyForm, type FormState } from "../views/components";
import { banUsersPage, categoriesPage, ratingsPage, reportsPage } from "../views/platform";

export const platformRoutes = new Hono<AppEnv>();

// ------------------------------------------------------------------- reports

platformRoutes.get("/reports", async (c) => {
  return c.html(reportsPage(pageCtx(c), await generateReport(c.get("db"), parsePeriod(c.req.query("period")))));
});

platformRoutes.get("/reports/export", async (c) => {
  const period = parsePeriod(c.req.query("period"));
  const csv = reportToCsv(await generateReport(c.get("db"), period));
  return c.body(csv, 200, {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="prestige-${period.toLowerCase()}-report-${todayLocal()}.csv"`,
  });
});

// ---------------------------------------------------------------- categories

async function renderCategories(c: Ctx, f: FormState, status: 200 | 422 = 200) {
  const db = c.get("db");
  const [categories, usage] = await Promise.all([listCategories(db), categoryUsage(db)]);
  return c.html(categoriesPage(pageCtx(c), categories, usage, f), status);
}

platformRoutes.get("/categories", (c) => renderCategories(c, emptyForm()));

platformRoutes.post("/categories", async (c) => {
  const values = await readForm(c);
  const f: FormState = { values, errors: {} };
  if (!clean(values.name)) f.errors.name = "Category name is required";
  else {
    try {
      const created = await createCategory(c.get("db"), values.name, values.description);
      setFlash(c, "success", `Category '${created.name}' created.`);
      return c.redirect("/platform/categories");
    } catch (e) {
      if (!(e instanceof BusinessError)) throw e;
      f.global = e.message;
    }
  }
  return renderCategories(c, f, 422);
});

platformRoutes.post("/categories/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const form = await readForm(c);
  await updateCategory(c.get("db"), id, form.name ?? "", form.description);
  setFlash(c, "success", "Category updated.");
  return c.redirect("/platform/categories");
});

platformRoutes.post("/categories/:id/toggle", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const category = await toggleCategory(c.get("db"), id);
  setFlash(c, "success", `'${category.name}' is now ${category.active ? "active" : "inactive"}.`);
  return c.redirect("/platform/categories");
});

platformRoutes.post("/categories/:id/delete", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  await deleteCategory(c.get("db"), id);
  setFlash(c, "success", "Category deleted.");
  return c.redirect("/platform/categories");
});

// --------------------------------------------------------- bans (story 6)

platformRoutes.get("/users", async (c) => {
  const filters = { q: c.req.query("q") ?? "", role: c.req.query("role") ?? "", status: c.req.query("status") ?? "" };
  return c.html(banUsersPage(pageCtx(c), await searchUsers(c.get("db"), filters), filters));
});

platformRoutes.post("/users/:id/ban", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const form = await readForm(c);
  const user = await banUser(c.get("db"), c.get("user")!.id, id, form.reason);
  setFlash(c, "success", `'${user.username}' has been banned and signed out.`);
  return c.redirect(backPath(c, "/platform/users"));
});

platformRoutes.post("/users/:id/unban", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const user = await unbanUser(c.get("db"), id);
  setFlash(c, "success", `The ban on '${user.username}' has been lifted.`);
  return c.redirect(backPath(c, "/platform/users"));
});

// -------------------------------------------------------- ratings (story 5)

platformRoutes.get("/ratings", async (c) => {
  const db = c.get("db");
  const [ratings, summary, top] = await Promise.all([allRatings(db), ratingForPlatform(db), topRatedProjects(db, 5)]);
  return c.html(ratingsPage(pageCtx(c), ratings, summary, top));
});

for (const [action, visible] of [["hide", false], ["show", true]] as const) {
  platformRoutes.post(`/ratings/:id/${action}`, async (c) => {
    const id = intParam(c.req.param("id"));
    if (id === null) return c.notFound();
    await setRatingVisible(c.get("db"), id, visible);
    setFlash(c, "success", visible ? "Rating is visible again." : "Rating hidden. It no longer counts towards averages.");
    return c.redirect("/platform/ratings");
  });
}

platformRoutes.post("/ratings/:id/delete", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  await deleteRating(c.get("db"), id);
  setFlash(c, "success", "Rating deleted.");
  return c.redirect("/platform/ratings");
});
