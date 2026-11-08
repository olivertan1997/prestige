import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env";
import type { Role } from "../types";
import type { PageCtx } from "../views/layout";
import { errorPage } from "../views/public";
import { takeFlash, type Ctx } from "./http";

/** Everything a page needs about the current request (user, path, one-time message). */
export function pageCtx(c: Ctx): PageCtx {
  return { user: c.get("user") ?? null, path: new URL(c.req.url).pathname, flash: takeFlash(c) };
}

/** Route guard: must be logged in, and (if roles are given) have one of those roles. */
export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!user) return c.redirect(c.get("sessionExpired") ? "/login?expired" : "/login");
    if (roles.length && !roles.includes(user.role)) return c.html(errorPage(pageCtx(c), 403), 403);
    await next();
  });
}
