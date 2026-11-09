import { Hono } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { DbHandle } from "./db";
import type { AppEnv, Bindings } from "./env";
import { pageCtx, requireRole } from "./lib/context";
import { BusinessError, NotFoundError } from "./lib/errors";
import { backPath, setFlash, type Ctx } from "./lib/http";
import { SESSION_COOKIE, loadSessionUser } from "./lib/sessions";
import { accountRoutes, customerRoutes, issueManagementRoutes } from "./routes/account";
import { adminRoutes } from "./routes/admin";
import { designerRoutes } from "./routes/designer";
import { publicRoutes } from "./routes/public";
import { errorPage } from "./views/public";

export interface AppDeps {
  /** Opens a database connection for one request. */
  openDb: (env: Bindings) => DbHandle;
}

function requestOrigin(c: Ctx): string | null {
  const origin = c.req.header("origin");
  if (origin) return origin;
  try {
    return new URL(c.req.header("referer") ?? "").origin;
  } catch {
    return null;
  }
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  // 1. Forms may only be submitted from this site (CSRF protection; cookies are also SameSite=Lax).
  app.use("*", async (c, next) => {
    if (c.req.method !== "GET" && c.req.method !== "HEAD" && requestOrigin(c) !== new URL(c.req.url).origin) {
      c.set("user", null);
      return c.html(errorPage(pageCtx(c), 403), 403);
    }
    await next();
  });

  // 2. One database client per request (Hyperdrive pools the real connections).
  app.use("*", async (c, next) => {
    const handle = deps.openDb(c.env);
    c.set("db", handle.db);
    try {
      await next();
    } finally {
      if (handle.close) {
        const closing = handle.close().catch(() => undefined);
        try {
          c.executionCtx.waitUntil(closing);
        } catch {
          await closing;
        }
      }
    }
  });

  // 3. Who is logged in?
  app.use("*", async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    let user = null;
    if (token) {
      user = await loadSessionUser(c.get("db"), token);
      if (!user) deleteCookie(c, SESSION_COOKIE, { path: "/" });
    }
    c.set("user", user);
    c.set("sessionExpired", !!token && !user);
    await next();
  });

  app.use("/admin/*", requireRole("USER_ADMIN"));
  app.use("/platform/*", requireRole("PLATFORM_MANAGEMENT"));
  app.use("/designer/*", requireRole("INTERIOR_DESIGNER"));
  app.use("/customer/*", requireRole("CUSTOMER"));
  app.use("/issues/manage/*", requireRole("USER_ADMIN", "PLATFORM_MANAGEMENT"));
  app.use("/issues/manage", requireRole("USER_ADMIN", "PLATFORM_MANAGEMENT"));
  app.use("/issues", requireRole());
  app.use("/profile", requireRole());
  app.use("/profile/*", requireRole());
  app.use("/dashboard", requireRole());

  app.route("/", publicRoutes);
  app.route("/", accountRoutes);
  app.route("/issues/manage", issueManagementRoutes);
  app.route("/customer", customerRoutes);
  app.route("/designer", designerRoutes);
  app.route("/admin", adminRoutes);

  app.notFound((c) => c.html(errorPage(pageCtx(c), 404), 404));

  app.onError((err, c) => {
    if (err instanceof BusinessError) {
      // Simple actions (ban, favourite, ...): go back and show the reason.
      setFlash(c, "error", err.message);
      return c.redirect(backPath(c, "/dashboard"));
    }
    if (err instanceof NotFoundError) return c.html(errorPage(pageCtx(c), 404), 404);
    if (err instanceof HTTPException && err.status < 500) return c.html(errorPage(pageCtx(c), err.status), err.status);
    console.error("Unhandled error", err);
    return c.html(errorPage({ user: c.get("user") ?? null, path: new URL(c.req.url).pathname, flash: null }, 500), 500);
  });

  return app;
}
