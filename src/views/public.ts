import { html } from "hono/html";
import {
  type Category,
  type Project,
} from "../types";
import {
  projectGrid,
} from "./components";
import { page, type H, type PageCtx } from "./layout";

const TITLE = "Prestige Interior Design";

export function homePage(ctx: PageCtx, featured: Project[], categories: Category[], logout: boolean): H {
  const hero = html`<section class="hero"><div class="container">
    <p class="eyebrow" style="color:#d9b77e">Prestige Interior Design</p>
    <h1>Find the designer behind your <em>dream space</em>.</h1>
    <p class="lead">Browse real interior design projects, compare studios, check their availability and save your favourite ideas for later.</p>
    <div class="hero-stats">
      <div><strong>${featured.length}+</strong><span>featured projects</span></div>
      <div><strong>${categories.length}</strong><span>design categories</span></div>
    </div>
  </div></section>`;
  const body = html`
  ${logout ? html`<div class="alert alert-info">You have been logged out. See you soon!</div>` : ""}
  <div class="page-head"><div><p class="eyebrow">Explore by space</p><h2>Categories</h2></div></div>
  <div class="chips">${categories.map((c) => html`<span class="chip">${c.name}</span>`)}</div>

  <div class="page-head" style="margin-top:44px">
    <div><p class="eyebrow">Most viewed</p><h2>Featured projects</h2></div>
  </div>
  ${projectGrid(featured, null, "No projects have been published yet.")}
  `;
  return page(ctx, `${TITLE} - beautiful spaces, thoughtfully designed`, body, { hero });
}

export function loginPage(ctx: PageCtx, reason: string | null, username = ""): H {
  const messages: Record<string, H> = {
    error: html`<div class="alert alert-error">Incorrect username or password.</div>`,
    expired: html`<div class="alert alert-info">Please log in to continue. (Your session ended or your account was changed.)</div>`,
  };
  return page(ctx, `Log in · ${TITLE}`, html`<div class="auth-wrap"><div class="panel">
    <p class="eyebrow">Welcome back</p><h1>Log in</h1>
    ${reason && messages[reason] ? messages[reason] : ""}
    <form action="/login" method="post" class="stack">
      <div class="field"><label for="username">Username</label><input type="text" id="username" name="username" value="${username}" autocomplete="username" required autofocus></div>
      <div class="field"><label for="password">Password</label><input type="password" id="password" name="password" autocomplete="current-password" required></div>
      <button class="btn btn-dark btn-block" type="submit">Log in</button>
    </form>
  </div></div>`, { bare: true });
}

export function errorPage(ctx: PageCtx, status: number): H {
  const heading = status === 404 ? "We couldn't find that page" : status === 403 ? "You don't have access to this page" : status === 400 ? "That request didn't look right" : "Something went wrong on our side";
  return page(ctx, `${status} · ${TITLE}`, html`<div class="error-page">
    <div class="code">${status}</div>
    <h1>${heading}</h1>
    <p class="muted">The link may be broken, or the item may have been removed.</p>
    <div class="row" style="justify-content:center"><a class="btn btn-dark" href="/">Go to the homepage</a></div>
  </div>`);
}
