import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv } from "../env";
import { pageCtx } from "../lib/context";
import { parseMonth } from "../lib/dates";
import { intParam, isHttps, readForm, setFlash, type Ctx } from "../lib/http";
import { SESSION_COOKIE, SESSION_DAYS, createSession, destroySession } from "../lib/sessions";
import { buildCalendar } from "../services/availability";
import { getCompany, listActiveCategories } from "../services/catalog";
import { countActiveDesigners, getActiveDesigner, listDesigners } from "../services/directory";
import {
  featuredProjects,
  searchProjects,
} from "../services/projects";
import { authenticate } from "../services/users";
import { designerPage, designersPage, homePage, loginPage, searchPage } from "../views/public";

export const publicRoutes = new Hono<AppEnv>();

publicRoutes.get("/healthz", (c) => c.text("ok"));

publicRoutes.get("/", async (c) => {
  const db = c.get("db");
  const [featured, categories, designers, designerCount] = await Promise.all([
    featuredProjects(db),
    listActiveCategories(db),
    listDesigners(db, null, 3),
    countActiveDesigners(db),
  ]);
  return c.html(homePage(pageCtx(c), featured, categories, designers, designerCount, c.req.query("logout") !== undefined));
});

// ---------------------------------------------------------------- login / logout

publicRoutes.get("/login", (c) => {
  if (c.get("user")) return c.redirect("/dashboard");
  const reason = ["error", "expired"].find((k) => c.req.query(k) !== undefined) ?? null;
  return c.html(loginPage(pageCtx(c), reason));
});

publicRoutes.post("/login", async (c) => {
  const form = await readForm(c);
  const result = await authenticate(c.get("db"), form.username ?? "", form.password ?? "");
  if (!result.ok) return c.redirect(`/login?${result.reason}`);
  const token = await createSession(c.get("db"), result.user.id);
  setCookie(c, SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: isHttps(c),
    sameSite: "Lax",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
  return c.redirect("/dashboard");
});

publicRoutes.post("/logout", async (c) => {
  await destroySession(c.get("db"), getCookie(c, SESSION_COOKIE));
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.redirect("/?logout");
});

/** Sends each role to its own workspace. */
publicRoutes.get("/dashboard", (c) => {
  const role = c.get("user")!.role;
  const target = { USER_ADMIN: "/", PLATFORM_MANAGEMENT: "/", INTERIOR_DESIGNER: "/designer/dashboard", CUSTOMER: "/projects" }[role];
  return c.redirect(target);
});

// --------------------------------------------------------------------- projects

publicRoutes.get("/projects", async (c) => {
  const db = c.get("db");
  const view = {
    q: c.req.query("q") ?? "",
    category: intParam(c.req.query("category")),
    status: c.req.query("status") ?? "",
    sort: c.req.query("sort") ?? "newest",
  };
  const [result, categories] = await Promise.all([
    searchProjects(db, { q: view.q, categoryId: view.category, status: view.status, sort: view.sort, page: intParam(c.req.query("page")) ?? 0 }),
    listActiveCategories(db),
  ]);
  return c.html(searchPage(pageCtx(c), result, view, categories));
});

// -------------------------------------------------------------------- designers

publicRoutes.get("/designers", async (c) => {
  const q = c.req.query("q") ?? "";
  return c.html(designersPage(pageCtx(c), await listDesigners(c.get("db"), q), q));
});

publicRoutes.get("/designers/:id", async (c) => {
  const db = c.get("db");
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const designer = await getActiveDesigner(db, id);
  const [company, calendar] = await Promise.all([
    getCompany(db, id),
    buildCalendar(db, id, parseMonth(c.req.query("month"))),
  ]);
  return c.html(designerPage(pageCtx(c), { designer, company, calendar }));
});
