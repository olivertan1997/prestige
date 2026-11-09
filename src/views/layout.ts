import { html } from "hono/html";
import type { Flash } from "../env";
import { year } from "../lib/dates";
import { ROLE_LABELS, type Role, type SessionUser } from "../types";

export type H = ReturnType<typeof html>;

export interface PageCtx {
  user: SessionUser | null;
  path: string;
  flash: Flash | null;
}

const WORKSPACE_LINKS: Record<Role, [string, string][]> = {
  CUSTOMER: [
    ["/projects", "Search projects"],
    ["/designers", "Designers & calendars"],
    ["/customer/favourites", "My favourites"],
    ["/issues", "My reported issues"],
  ],
  INTERIOR_DESIGNER: [
    ["/designer/dashboard", "Dashboard"],
    ["/designer/projects", "Portfolio"],
    ["/designer/company", "Company"],
    ["/designer/availability", "Availability"],
    ["/designer/users", "User directory"],
    ["/issues", "My reported issues"],
  ],
  USER_ADMIN: [
    ["/admin/users", "User accounts"],
    ["/admin/profiles", "User profiles"],
    ["/issues/manage", "Reported issues"],
  ],
  PLATFORM_MANAGEMENT: [
    ["/issues/manage", "Reported issues"],
  ],
};

const WORKSPACE_LABEL: Record<Role, string> = {
  CUSTOMER: "Customer",
  INTERIOR_DESIGNER: "Designer",
  USER_ADMIN: "User Admin",
  PLATFORM_MANAGEMENT: "Platform",
};

const active = (path: string, href: string, exact = false) =>
  (exact ? path === href : path === href || path.startsWith(href + "/")) ? "active" : "";

function header(ctx: PageCtx): H {
  const u = ctx.user;
  return html`<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/"><span class="brand-mark">P</span><span class="brand-text">Prestige<small>Interior Design</small></span></a>
    <nav class="main-nav" aria-label="Main">
      <a href="/projects" class="${active(ctx.path, "/projects")}">Projects</a>
      <a href="/designers" class="${active(ctx.path, "/designers")}">Designers</a>
      ${u?.role === "CUSTOMER" ? html`<a href="/customer/favourites" class="${active(ctx.path, "/customer")}">My favourites</a>` : ""}
    </nav>
    ${u
      ? html`<details class="account-menu">
          <summary>
            <span class="avatar">${u.fullName.slice(0, 1).toUpperCase()}</span>
            <span class="who"><strong>${u.fullName}</strong><small>${ROLE_LABELS[u.role]}</small></span>
          </summary>
          <div class="menu">
            <a href="/dashboard">My workspace</a>
            <a href="/profile">My profile</a>
            <a href="/issues">Report an issue</a>
            <form action="/logout" method="post"><button type="submit">Log out</button></form>
          </div>
        </details>`
      : html`<div class="account">
          <a class="btn btn-ghost btn-sm" href="/login">Log in</a>
          <a class="btn btn-gold btn-sm" href="/register">Join Prestige</a>
        </div>`}
  </div>
  ${u
    ? html`<div class="workspace-nav"><div class="container">
        <span class="label">${WORKSPACE_LABEL[u.role]}</span>
        ${WORKSPACE_LINKS[u.role].map(([href, text]) => html`<a href="${href}" class="${active(ctx.path, href, true)}">${text}</a>`)}
      </div></div>`
    : ""}
</header>`;
}

export function flashMessages(flash: Flash | null): H {
  return html`${flash?.success ? html`<div class="alert alert-success" role="status">${flash.success}</div>` : ""}${flash?.error
    ? html`<div class="alert alert-error" role="alert">${flash.error}</div>`
    : ""}`;
}

function footer(): H {
  return html`<footer class="site-footer"><div class="container">
  <div><strong style="color:#fff;font-family:var(--serif);font-size:1.2rem">Prestige Interior Design</strong><br>Beautiful spaces, thoughtfully designed.</div>
  <div><a href="/projects">Projects</a> &middot; <a href="/designers">Designers</a> &middot; <a href="/issues">Report an issue</a></div>
  <div>&copy; ${year()} Prestige Interior Design</div>
</div></footer>`;
}

/** Full HTML page. `hero` is rendered full-width above the main container (home page). */
export function page(ctx: PageCtx, title: string, body: H, opts: { hero?: H; bare?: boolean } = {}): H {
  return html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="Prestige Interior Design - discover interior design projects, meet designers and check their availability.">
  <link rel="icon" type="image/svg+xml" href="/images/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
${header(ctx)}
${opts.hero ?? ""}
<main class="container${opts.bare ? "" : " section"}">
${flashMessages(ctx.flash)}
${body}
</main>
${footer()}
</body>
</html>`;
}
