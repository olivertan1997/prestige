import { html } from "hono/html";
import { fmtDate } from "../lib/dates";
import type { CalendarMonth } from "../services/availability";
import type { DesignerCard } from "../services/directory";
import type { ProjectPage } from "../services/projects";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  ROLE_LABELS,
  type Category,
  type Company,
  type Project,
  type Rating,
  type RatingSummary,
  type Role,
  type User,
} from "../types";
import {
  avgText,
  calendar,
  filterSelect,
  globalError,
  input,
  money,
  placeholderClass,
  projectGrid,
  ratingLine,
  stars,
  type FormState,
} from "./components";
import { page, type H, type PageCtx } from "./layout";

const TITLE = "Prestige Interior Design";

function designerCards(designers: DesignerCard[]): H {
  return html`<div class="grid grid-3">${designers.map(
    (d) => html`<a class="card designer-card" href="/designers/${d.id}" style="color:inherit">
      <div class="top">
        <div class="monogram">${(d.companyName ?? d.fullName).slice(0, 1)}</div>
        <div><h3 style="margin:0">${d.companyName ?? d.fullName}</h3><span class="muted small">${d.fullName}</span></div>
      </div>
      <p class="muted small" style="margin:0">${d.specialties ?? (d.description ? d.description.slice(0, 140) : "Interior design studio")}</p>
      <div class="row small" style="margin-top:auto">${ratingLine(d.rating)}<span class="right muted">${d.projectCount} project(s)</span></div>
    </a>`,
  )}</div>`;
}

export function homePage(ctx: PageCtx, featured: Project[], categories: Category[], designers: DesignerCard[], designerCount: number, logout: boolean): H {
  const hero = html`<section class="hero"><div class="container">
    <p class="eyebrow" style="color:#d9b77e">Prestige Interior Design</p>
    <h1>Find the designer behind your <em>dream space</em>.</h1>
    <p class="lead">Browse real interior design projects, compare studios, check their availability and save your favourite ideas for later.</p>
    <form class="hero-search" action="/projects" method="get" role="search">
      <input type="search" name="q" placeholder="Try &quot;Japandi kitchen&quot;, &quot;Scandinavian&quot; or &quot;Punggol&quot;" aria-label="Search projects">
      <button class="btn btn-gold" type="submit">Search projects</button>
    </form>
    <div class="hero-stats">
      <div><strong>${featured.length}+</strong><span>featured projects</span></div>
      <div><strong>${categories.length}</strong><span>design categories</span></div>
      <div><strong>${designerCount}</strong><span>studios</span></div>
    </div>
  </div></section>`;
  const body = html`
  ${logout ? html`<div class="alert alert-info">You have been logged out. See you soon!</div>` : ""}
  <div class="page-head"><div><p class="eyebrow">Explore by space</p><h2>Categories</h2></div></div>
  <div class="chips">${categories.map((c) => html`<a class="chip" href="/projects?category=${c.id}">${c.name}</a>`)}</div>

  <div class="page-head" style="margin-top:44px">
    <div><p class="eyebrow">Most viewed</p><h2>Featured projects</h2></div>
    <a class="btn btn-ghost" href="/projects">View all projects &rarr;</a>
  </div>
  ${projectGrid(featured, null, "No projects have been published yet.")}

  ${designers.length
    ? html`<div class="page-head" style="margin-top:44px">
        <div><p class="eyebrow">Studios</p><h2>Meet our designers</h2></div>
        <a class="btn btn-ghost" href="/designers">All designers &rarr;</a>
      </div>${designerCards(designers)}`
    : ""}

  ${ctx.user ? "" : html`<div class="panel" style="margin-top:44px"><div class="row between">
      <div><h2 style="margin-bottom:6px">Are you an interior designer?</h2>
      <p class="muted" style="margin:0">Showcase your portfolio, publish your availability and see how many people view and shortlist your work.</p></div>
      <a class="btn btn-dark" href="/register">Create a free designer account</a>
    </div></div>`}`;
  return page(ctx, `${TITLE} - beautiful spaces, thoughtfully designed`, body, { hero });
}

export function loginPage(ctx: PageCtx, reason: string | null, username = ""): H {
  const messages: Record<string, H> = {
    error: html`<div class="alert alert-error">Incorrect username or password.</div>`,
    banned: html`<div class="alert alert-error">This account has been banned by Platform Management.</div>`,
    disabled: html`<div class="alert alert-error">This account is disabled. Please contact a User Admin.</div>`,
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
    <p class="muted small" style="margin:18px 0 0">New to Prestige? <a href="/register">Create an account</a></p>
  </div></div>`, { bare: true });
}

export function registerPage(ctx: PageCtx, f: FormState): H {
  const roles: [Role, string][] = [["CUSTOMER", "Search, save and rate projects"], ["INTERIOR_DESIGNER", "Show my portfolio and availability"]];
  const chosen = f.values.role || "CUSTOMER";
  return page(ctx, `Create an account · ${TITLE}`, html`<div class="auth-wrap wide"><div class="panel">
    <p class="eyebrow">Join Prestige</p><h1>Create your account</h1>
    <form action="/register" method="post">
      ${globalError(f)}
      <p class="label">I am a...</p>
      <div class="role-picker" style="margin-bottom:18px">${roles.map(
        ([role, text]) => html`<label><input type="radio" name="role" value="${role}"${chosen === role ? html` checked` : ""}>
          <span><strong>${ROLE_LABELS[role]}</strong> <span class="muted small">${text}</span></span></label>`,
      )}</div>
      <div class="form-grid">
        ${input(f, "fullName", "Full name", { autocomplete: "name", required: true })}
        ${input(f, "username", "Username", { autocomplete: "username", required: true, hint: "3-50 letters, numbers, dots, dashes or underscores" })}
        ${input(f, "email", "Email", { type: "email", autocomplete: "email", required: true })}
        ${input(f, "phone", "Phone (optional)", { autocomplete: "tel" })}
        ${input(f, "password", "Password", { type: "password", autocomplete: "new-password", required: true, hint: "At least 8 characters. Stored only as a salted SHA-256 hash." })}
        ${input(f, "confirmPassword", "Confirm password", { type: "password", autocomplete: "new-password", required: true })}
      </div>
      <div class="form-actions"><button class="btn btn-dark" type="submit">Create account</button><a class="btn btn-ghost" href="/login">I already have an account</a></div>
    </form>
  </div></div>`, { bare: true });
}

export interface SearchView {
  q: string;
  category: number | null;
  status: string;
  sort: string;
}

export function searchPage(ctx: PageCtx, result: ProjectPage, view: SearchView, categories: Category[], favIds: Set<number>): H {
  const qs = (page: number) =>
    "/projects?" + new URLSearchParams({ q: view.q, category: view.category ? String(view.category) : "", status: view.status, sort: view.sort, page: String(page) }).toString();
  const sorts = [["newest", "Newest"], ["views", "Most viewed"], ["shortlisted", "Most shortlisted"], ["title", "Title A-Z"]];
  return page(ctx, `Search projects · ${TITLE}`, html`
  <div class="page-head"><div><p class="eyebrow">Interior design projects</p><h1>Find inspiration</h1>
    <p class="muted">Search by style, room, location or designer. Every word you type must match.</p></div></div>
  <form class="filters" action="/projects" method="get" role="search">
    <div class="field grow"><label for="q">Keywords</label><input type="search" id="q" name="q" value="${view.q}" placeholder="e.g. japandi kitchen, minimalist, Punggol"></div>
    ${filterSelect("category", "Category", categories.map((c) => ({ value: String(c.id), label: c.name })), view.category ? String(view.category) : "", "All categories")}
    ${filterSelect("status", "Project type", PROJECT_STATUSES.map((s) => ({ value: s, label: `${PROJECT_STATUS_LABELS[s]} projects` })), view.status, "Current & past")}
    <div class="field"><label for="sort">Sort by</label><select id="sort" name="sort">${sorts.map(([v, l]) => html`<option value="${v}"${view.sort === v ? html` selected` : ""}>${l}</option>`)}</select></div>
    <button class="btn btn-dark" type="submit">Search</button>
  </form>
  <p class="muted small">${result.total} project(s) found${view.q ? ` for "${view.q}"` : ""}</p>
  ${result.items.length
    ? projectGrid(result.items, favIds)
    : html`<div class="panel empty"><h3>No projects match your search</h3><p>Try fewer or different keywords, or clear the filters.</p><a class="btn btn-ghost" href="/projects">Clear search</a></div>`}
  ${result.totalPages > 1
    ? html`<nav class="pagination" aria-label="Pages">
        ${result.page > 0 ? html`<a href="${qs(result.page - 1)}">&lsaquo; Previous</a>` : html`<span class="disabled">&lsaquo; Previous</span>`}
        <span class="current">Page ${result.page + 1} of ${result.totalPages}</span>
        ${result.page + 1 < result.totalPages ? html`<a href="${qs(result.page + 1)}">Next &rsaquo;</a>` : html`<span class="disabled">Next &rsaquo;</span>`}
      </nav>`
    : ""}`);
}

export interface ProjectDetailView {
  project: Project;
  company: Company | null;
  rating: RatingSummary;
  designerRating: RatingSummary;
  reviews: Rating[];
  currentFavourites: number;
  isFavourite: boolean;
  myRating: Rating | null;
}

export function projectPage(ctx: PageCtx, v: ProjectDetailView): H {
  const p = v.project;
  const isCustomer = ctx.user?.role === "CUSTOMER";
  return page(ctx, `${p.title} · ${TITLE}`, html`
  <p class="small"><a href="/projects">&larr; All projects</a></p>
  ${p.designerStatus !== "ACTIVE" ? html`<div class="alert alert-error">This designer's account is ${p.designerStatus.toLowerCase()}, so this project is hidden from the public.</div>` : ""}
  <div class="split">
    <article>
      <div class="detail-hero ${placeholderClass(p)}">
        ${p.imageUrl ? html`<img src="${p.imageUrl}" alt="${p.title}">` : html`<span class="ph-letter">${p.title.slice(0, 1)}</span>`}
      </div>
      <div style="margin-top:22px">
        <p class="eyebrow">${p.categoryName ?? "Uncategorised"} &middot; ${PROJECT_STATUS_LABELS[p.status]} project</p>
        <h1>${p.title}</h1>
        <div class="row small">${stars(v.rating.count ? Math.round(v.rating.average ?? 0) : 0)}
          <span class="muted">${v.rating.count ? `${avgText(v.rating)} from ${v.rating.count} rating(s)` : "Not rated yet"}</span></div>
      </div>
      <div class="facts">
        <div><span>Style</span><strong>${p.style ?? "-"}</strong></div>
        <div><span>Location</span><strong>${p.location ?? "-"}</strong></div>
        <div><span>Budget</span><strong>${money(p.budget)}</strong></div>
        <div><span>Timeline</span><strong>${p.startDate ? fmtDate(p.startDate) : "Start not set"} &ndash; ${p.endDate ? fmtDate(p.endDate) : "ongoing"}</strong></div>
        <div><span>Views</span><strong>${p.viewCount}</strong></div>
        <div><span>Shortlisted</span><strong>${p.shortlistCount} times</strong></div>
      </div>
      <h3>About this project</h3>
      <p class="prose">${p.description ?? "No description provided."}</p>

      <hr class="soft">
      <section id="reviews">
        <h2>Ratings &amp; reviews</h2>
        <p class="muted small">Ratings come from Prestige customers and give an alternative measure of the designer's work and service.</p>
        ${isCustomer
          ? html`<form class="panel" action="/customer/ratings/${p.id}" method="post" style="margin:16px 0">
              <h3>${v.myRating ? "Update your rating" : "Rate this project"}</h3>
              <div class="star-input" role="radiogroup" aria-label="Stars">${[5, 4, 3, 2, 1].map(
                (i) => html`<input type="radio" name="score" id="star${i}" value="${i}"${v.myRating?.score === i ? html` checked` : ""} required><label for="star${i}" title="${i} star(s)">&#9733;</label>`,
              )}</div>
              <div class="field" style="margin-top:10px"><label for="comment">Review (optional)</label>
                <textarea id="comment" name="comment" maxlength="1000" placeholder="What did you like? How was the service?">${v.myRating?.comment ?? ""}</textarea></div>
              <div class="form-actions"><button class="btn btn-dark" type="submit">Submit rating</button></div>
            </form>`
          : ctx.user ? "" : html`<div class="panel" style="margin:16px 0"><a href="/login">Log in as a customer</a> to rate this project.</div>`}
        ${v.reviews.length ? "" : html`<div class="muted">No reviews yet.</div>`}
        ${v.reviews.map((r) => html`<div class="review">
          <div class="row">${stars(r.score)}<strong>${r.customerName}</strong><span class="muted small right">${fmtDate(r.createdAt)}</span></div>
          ${r.comment ? html`<p style="margin:6px 0 0">${r.comment}</p>` : ""}
        </div>`)}
      </section>
    </article>

    <aside class="stack sticky">
      ${isCustomer
        ? html`<div class="panel"><h3>Save for later</h3><p class="muted small">Add this project to your favourites list to compare ideas later.</p>
            ${v.isFavourite
              ? html`<form action="/customer/favourites/${p.id}/remove" method="post"><button class="btn btn-ghost btn-block" type="submit">&#9829; Saved - remove</button></form>`
              : html`<form action="/customer/favourites/${p.id}" method="post"><button class="btn btn-gold btn-block" type="submit">&#9825; Save to favourites</button></form>`}
          </div>`
        : ctx.user ? "" : html`<div class="panel"><h3>Like this project?</h3><p class="muted small">Create a free customer account to save it to your favourites.</p><a class="btn btn-gold btn-block" href="/register">Join Prestige</a></div>`}
      <div class="panel">
        <p class="eyebrow">Designed by</p>
        <h3>${v.company?.name ?? p.designerName}</h3>
        ${v.company ? html`<p class="muted small">Lead designer: ${p.designerName}</p>` : ""}
        <div class="row small" style="margin-bottom:10px">${ratingLine(v.designerRating)}</div>
        ${v.company?.specialties ? html`<p class="small">${v.company.specialties}</p>` : ""}
        <a class="btn btn-dark btn-block" href="/designers/${p.designerId}#calendar">View availability calendar</a>
      </div>
      <div class="panel small"><strong>${v.currentFavourites}</strong> customer(s) currently have this project in their favourites.</div>
    </aside>
  </div>`);
}

export function designersPage(ctx: PageCtx, designers: DesignerCard[], q: string): H {
  return page(ctx, `Designers · ${TITLE}`, html`
  <div class="page-head">
    <div><p class="eyebrow">Studios</p><h1>Our interior designers</h1><p class="muted">Open a designer to see their company, portfolio and availability calendar.</p></div>
    <form class="row" action="/designers" method="get"><input type="search" name="q" value="${q}" placeholder="Search by designer or company" style="min-width:260px"><button class="btn btn-dark" type="submit">Search</button></form>
  </div>
  ${designers.length ? designerCards(designers) : html`<div class="panel empty">No designers found.</div>`}`);
}

export interface DesignerDetailView {
  designer: User;
  company: Company | null;
  projects: Project[];
  rating: RatingSummary;
  calendar: CalendarMonth;
}

export function designerPage(ctx: PageCtx, v: DesignerDetailView): H {
  const name = v.company?.name ?? v.designer.fullName;
  const c = v.company;
  const row = (label: string, value: unknown) => (value === null || value === undefined || value === "" ? "" : html`<dt>${label}</dt><dd>${String(value)}</dd>`);
  return page(ctx, `${name} · ${TITLE}`, html`
  <p class="small"><a href="/designers">&larr; All designers</a></p>
  <div class="page-head"><div class="row" style="gap:18px">
    <div class="monogram" style="width:72px;height:72px;font-size:2.2rem">${name.slice(0, 1)}</div>
    <div><p class="eyebrow">Interior designer</p><h1 style="margin:0">${name}</h1>
      <div class="row small"><span>${v.designer.fullName}</span>${ratingLine(v.rating)}</div></div>
  </div></div>
  <div class="split">
    <div class="stack">
      <div>
        <h2>Availability</h2>
        <p class="muted small">Green slots are open for consultations and site visits. Use them to plan when to start your renovation.</p>
        ${calendar(v.calendar, `/designers/${v.designer.id}`)}
      </div>
      <div><h2 style="margin-top:20px">Portfolio</h2>${projectGrid(v.projects)}</div>
    </div>
    <aside class="panel sticky">
      <h3>Company information</h3>
      ${c
        ? html`${c.description ? html`<p class="prose small">${c.description}</p>` : ""}
          <dl class="kv">
            ${row("Specialties", c.specialties)}
            ${row("Experience", c.yearsInBusiness !== null ? `${c.yearsInBusiness} years` : null)}
            ${row("Registration no.", c.registrationNumber)}
            ${row("Address", c.address)}
            ${row("Phone", c.phone)}
            ${c.email ? html`<dt>Email</dt><dd><a href="mailto:${c.email}">${c.email}</a></dd>` : ""}
            ${c.website ? html`<dt>Website</dt><dd><a href="${c.website}" rel="noopener nofollow" target="_blank">${c.website}</a></dd>` : ""}
          </dl>`
        : html`<div class="muted">This designer has not added company information yet.</div>`}
    </aside>
  </div>`);
}

export function errorPage(ctx: PageCtx, status: number): H {
  const heading = status === 404 ? "We couldn't find that page" : status === 403 ? "You don't have access to this page" : status === 400 ? "That request didn't look right" : "Something went wrong on our side";
  return page(ctx, `${status} · ${TITLE}`, html`<div class="error-page">
    <div class="code">${status}</div>
    <h1>${heading}</h1>
    <p class="muted">The link may be broken, or the item may have been removed.</p>
    <div class="row" style="justify-content:center"><a class="btn btn-dark" href="/">Go to the homepage</a><a class="btn btn-ghost" href="/projects">Browse projects</a></div>
  </div>`);
}
