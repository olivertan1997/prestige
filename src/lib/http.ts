import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv, Flash } from "../env";

const FLASH_COOKIE = "pid_flash";

export type Ctx = Context<AppEnv>;

export function isHttps(c: Ctx): boolean {
  return new URL(c.req.url).protocol === "https:";
}

/** Shows a one-time message on the next page (Post/Redirect/Get). Hono URL-encodes cookie values. */
export function setFlash(c: Ctx, kind: keyof Flash, message: string): void {
  setCookie(c, FLASH_COOKIE, JSON.stringify({ [kind]: message }), {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: isHttps(c),
    maxAge: 60,
  });
}

export function takeFlash(c: Ctx): Flash | null {
  const raw = getCookie(c, FLASH_COOKIE);
  if (!raw) return null;
  deleteCookie(c, FLASH_COOKIE, { path: "/" });
  try {
    const parsed = JSON.parse(raw) as Flash;
    return typeof parsed === "object" && parsed ? parsed : null;
  } catch {
    return null;
  }
}

/** The page the user came from (path + query on this site only), for "go back" redirects. */
export function backPath(c: Ctx, fallback: string): string {
  const referer = c.req.header("referer");
  if (!referer) return fallback;
  try {
    const url = new URL(referer);
    if (url.host !== new URL(c.req.url).host) return fallback;
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}

/** Reads a submitted HTML form as plain strings. */
export async function readForm(c: Ctx): Promise<Record<string, string>> {
  const body = await c.req.parseBody();
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") out[key] = value;
    else if (Array.isArray(value)) {
      const first = value.find((v) => typeof v === "string");
      if (typeof first === "string") out[key] = first;
    }
  }
  return out;
}

export function intParam(value: string | undefined | null): number | null {
  if (!value || !/^\d{1,9}$/.test(value)) return null;
  return Number(value);
}
