import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv } from "../env";
import { pageCtx } from "../lib/context";
import { intParam, isHttps, readForm, setFlash, type Ctx } from "../lib/http";
import { SESSION_COOKIE, SESSION_DAYS, createSession, destroySession } from "../lib/sessions";
import { listActiveCategories } from "../services/catalog";
import {
  featuredProjects,
} from "../services/projects";
import { authenticate } from "../services/users";
import { homePage, loginPage } from "../views/public";

export const publicRoutes = new Hono<AppEnv>();

publicRoutes.get("/healthz", (c) => c.text("ok"));

publicRoutes.get("/", async (c) => {
  const db = c.get("db");
  const [featured, categories] = await Promise.all([
    featuredProjects(db),
    listActiveCategories(db),
  ]);
  return c.html(homePage(pageCtx(c), featured, categories, c.req.query("logout") !== undefined));
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
  const target = { USER_ADMIN: "/", PLATFORM_MANAGEMENT: "/", INTERIOR_DESIGNER: "/", CUSTOMER: "/" }[role];
  return c.redirect(target);
});
