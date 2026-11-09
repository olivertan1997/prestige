import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv } from "../env";
import { pageCtx } from "../lib/context";
import { parseMonth } from "../lib/dates";
import { BusinessError, clean } from "../lib/errors";
import { intParam, isHttps, readForm, setFlash, type Ctx } from "../lib/http";
import { SESSION_COOKIE, SESSION_DAYS, createSession, destroySession } from "../lib/sessions";
import { buildCalendar } from "../services/availability";
import { getCompany, listActiveCategories } from "../services/catalog";
import { countActiveDesigners, getActiveDesigner, listDesigners } from "../services/directory";
import {
  favouriteIds,
  featuredProjects,
  listDesignerProjects,
  searchProjects,
} from "../services/projects";
import { MIN_PASSWORD_LENGTH, authenticate, registerUser } from "../services/users";
import { SELF_SERVICE_ROLES, isOneOf } from "../types";
import type { FormState } from "../views/components";
import { designerPage, designersPage, homePage, loginPage, registerPage, searchPage } from "../views/public";

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
  const reason = ["error", "disabled", "expired"].find((k) => c.req.query(k) !== undefined) ?? null;
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
  const target = { USER_ADMIN: "/admin/users", PLATFORM_MANAGEMENT: "/", INTERIOR_DESIGNER: "/designer/dashboard", CUSTOMER: "/projects" }[role];
  return c.redirect(target);
});

// --------------------------------------------------------------------- register

publicRoutes.get("/register", (c) => {
  if (c.get("user")) return c.redirect("/dashboard");
  return c.html(registerPage(pageCtx(c), { values: { role: "CUSTOMER" }, errors: {} }));
});

function validateRegistration(v: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!clean(v.fullName)) errors.fullName = "Full name is required";
  const username = clean(v.username) ?? "";
  if (!/^[A-Za-z0-9._-]{3,50}$/.test(username)) errors.username = "Use 3-50 letters, numbers, dots, dashes or underscores";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v.email) ?? "")) errors.email = "Enter a valid email address";
  if ((v.password ?? "").length < MIN_PASSWORD_LENGTH) errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  if ((v.password ?? "") !== (v.confirmPassword ?? "")) errors.confirmPassword = "Passwords do not match";
  if (!isOneOf(SELF_SERVICE_ROLES, v.role)) errors.role = "Choose an account type";
  return errors;
}

publicRoutes.post("/register", async (c) => {
  const values = await readForm(c);
  const f: FormState = { values, errors: validateRegistration(values) };
  if (!Object.keys(f.errors).length) {
    try {
      await registerUser(c.get("db"), {
        username: values.username, email: values.email, fullName: values.fullName,
        password: values.password, role: values.role, phone: values.phone,
      });
      setFlash(c, "success", "Welcome to Prestige! Your account is ready - please log in.");
      return c.redirect("/login");
    } catch (e) {
      if (!(e instanceof BusinessError)) throw e;
      f.global = e.message;
    }
  } else if (f.errors.role) {
    f.global = f.errors.role;
  }
  return c.html(registerPage(pageCtx(c), f), 422);
});

// --------------------------------------------------------------------- projects

publicRoutes.get("/projects", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const view = {
    q: c.req.query("q") ?? "",
    category: intParam(c.req.query("category")),
    status: c.req.query("status") ?? "",
    sort: c.req.query("sort") ?? "newest",
  };
  const [result, categories, favIds] = await Promise.all([
    searchProjects(db, { q: view.q, categoryId: view.category, status: view.status, sort: view.sort, page: intParam(c.req.query("page")) ?? 0 }),
    listActiveCategories(db),
    user?.role === "CUSTOMER" ? favouriteIds(db, user.id) : Promise.resolve(new Set<number>()),
  ]);
  return c.html(searchPage(pageCtx(c), result, view, categories, favIds));
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
  const [company, projects, calendar] = await Promise.all([
    getCompany(db, id),
    listDesignerProjects(db, id),
    buildCalendar(db, id, parseMonth(c.req.query("month"))),
  ]);
  return c.html(designerPage(pageCtx(c), { designer, company, projects, calendar }));
});
