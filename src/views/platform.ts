import { html } from "hono/html";
import { fmtDate, fmtDateTime } from "../lib/dates";
import type { RankedProject } from "../services/projects";
import type { PlatformReport } from "../services/reports";
import {
  ACCOUNT_STATUS_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  PERIODS,
  PERIOD_INFO,
  ROLE_LABELS,
  type Category,
  type Rating,
  type RatingSummary,
  type User,
} from "../types";
import { avgText, badge, globalError, input, stars, avgStars, textarea, type FormState } from "./components";
import { page, type H, type PageCtx } from "./layout";
import { userFilterBar, type UserFilters } from "./admin";

const TITLE = "Prestige Interior Design";

function rankedList(items: RankedProject[], empty: string, showAverage = false): H {
  return html`<ul class="ranked">${items.map((r) => html`<li><a href="/projects/${r.id}">${r.title}</a>
    <strong>${showAverage && r.average !== null ? `${r.average.toFixed(1)} ★ (${r.count})` : r.count}</strong></li>`)}
    ${items.length ? "" : html`<li class="muted">${empty}</li>`}</ul>`;
}

export function reportsPage(ctx: PageCtx, report: PlatformReport): H {
  const info = PERIOD_INFO[report.period];
  const c = report.current;
  const stat = (label: string, value: string | number, note?: string) =>
    html`<div class="stat"><div class="label">${label}</div><div class="value">${value}</div>${note ? html`<div class="note">${note}</div>` : ""}</div>`;
  return page(ctx, `Platform reports · ${TITLE}`, html`
  <div class="page-head">
    <div><p class="eyebrow">Platform Management</p><h1>${info.label} report</h1><p class="muted">Generated ${fmtDateTime(report.generatedAt)} (Singapore time)</p></div>
    <div class="row">
      <div class="tabs">${PERIODS.map((p) => html`<a href="/platform/reports?period=${p}" class="${report.period === p ? "active" : ""}">${PERIOD_INFO[p].label}</a>`)}</div>
      <a class="btn btn-ghost" href="/platform/reports/export?period=${report.period}">Download CSV</a>
    </div>
  </div>
  <p class="eyebrow">${info.current} - ${c.label}</p>
  <div class="grid grid-4" style="margin-bottom:14px">
    ${stat("Project views", c.views)}${stat("Shortlists", c.shortlists)}${stat("New users", c.newUsers)}${stat("New projects", c.newProjects)}
  </div>
  <div class="grid grid-4" style="margin-bottom:28px">
    ${stat("Issues reported", c.issues)}${stat("Ratings given", c.ratings)}
    ${stat("Platform rating", avgText(report.platformRating), `${report.platformRating.count} ratings in total`)}
    ${stat("Accounts", report.totalUsers, `${report.totalDesigners} designers · ${report.totalCustomers} customers · ${report.bannedUsers} banned`)}
  </div>
  <h2>History</h2>
  <div class="table-wrap" style="margin-bottom:28px"><table>
    <thead><tr><th>Period</th><th>Views</th><th class="num">Views</th><th class="num">Shortlists</th><th class="num">New users</th>
      <th class="num">New projects</th><th class="num">Issues</th><th class="num">Ratings</th></tr></thead>
    <tbody>${report.rows.map((r) => html`<tr>
      <td>${r.label}</td>
      <td style="width:22%"><div class="bar"><span style="width:${Math.round((r.views * 100) / report.maxViews)}%"></span></div></td>
      <td class="num">${r.views}</td><td class="num">${r.shortlists}</td><td class="num">${r.newUsers}</td>
      <td class="num">${r.newProjects}</td><td class="num">${r.issues}</td><td class="num">${r.ratings}</td>
    </tr>`)}</tbody>
  </table></div>
  <div class="grid grid-3">
    <div class="panel"><h3>Most viewed - ${info.current.toLowerCase()}</h3>${rankedList(report.topViewed, "No views yet in this period.")}</div>
    <div class="panel"><h3>Most shortlisted - ${info.current.toLowerCase()}</h3>${rankedList(report.topShortlisted, "No shortlists yet in this period.")}</div>
    <div class="panel"><h3>Top rated (all time)</h3>${rankedList(report.topRated, "No ratings yet.", true)}</div>
    <div class="panel"><h3>Projects by category</h3><ul class="ranked">
      ${report.projectsByCategory.map((x) => html`<li><span>${x.label}</span><strong>${x.count}</strong></li>`)}
      ${report.projectsByCategory.length ? "" : html`<li class="muted">No projects yet.</li>`}</ul></div>
    <div class="panel"><h3>Reported issues</h3><ul class="ranked">
      ${ISSUE_STATUSES.map((s) => html`<li>${badge(s, ISSUE_STATUS_LABELS[s])}<strong>${report.issuesByStatus[s]}</strong></li>`)}</ul>
      <a class="btn btn-ghost btn-sm" href="/issues/manage" style="margin-top:10px">Open reported issues</a></div>
    <div class="panel"><h3>Totals in this report</h3><ul class="ranked">
      <li><span>Views over ${report.rows.length} periods</span><strong>${report.rows.reduce((a, r) => a + r.views, 0)}</strong></li>
      <li><span>Shortlists over ${report.rows.length} periods</span><strong>${report.rows.reduce((a, r) => a + r.shortlists, 0)}</strong></li>
      <li><span>Projects on the platform</span><strong>${report.totalProjects}</strong></li></ul></div>
  </div>`);
}

export function categoriesPage(ctx: PageCtx, categories: Category[], usage: Map<number, number>, f: FormState): H {
  return page(ctx, `Project categories · ${TITLE}`, html`
  <div class="page-head"><div><p class="eyebrow">Platform Management</p><h1>IDP categories</h1>
    <p class="muted">Designers pick one of the active categories for each project. Inactive categories are hidden from new projects and search filters.</p></div></div>
  <div class="split">
    <div class="table-wrap"><table>
      <thead><tr><th>Category</th><th>Status</th><th class="num">Projects</th><th></th></tr></thead>
      <tbody>
        ${categories.map((c) => html`<tr data-category="${c.id}">
          <td><form id="edit${c.id}" action="/platform/categories/${c.id}" method="post" class="stack" style="gap:6px">
            <input type="text" name="name" value="${c.name}" maxlength="60" required aria-label="Name">
            <input type="text" name="description" value="${c.description ?? ""}" maxlength="300" placeholder="Description" aria-label="Description">
          </form></td>
          <td>${c.active ? badge("active", "Active") : badge("disabled", "Inactive")}</td>
          <td class="num">${usage.get(c.id) ?? 0}</td>
          <td><div class="actions">
            <button class="btn btn-dark btn-sm" type="submit" form="edit${c.id}">Save</button>
            <form class="inline" action="/platform/categories/${c.id}/toggle" method="post"><button class="btn btn-ghost btn-sm" type="submit">${c.active ? "Deactivate" : "Activate"}</button></form>
            <form class="inline" action="/platform/categories/${c.id}/delete" method="post" onsubmit="return confirm('Delete this category?');"><button class="btn btn-danger btn-sm" type="submit">Delete</button></form>
          </div></td>
        </tr>`)}
        ${categories.length ? "" : html`<tr><td colspan="4" class="empty">No categories yet.</td></tr>`}
      </tbody>
    </table></div>
    <form class="panel" action="/platform/categories" method="post">
      <h3>New category</h3>
      ${globalError(f)}
      <div class="stack">
        ${input(f, "name", "Name", { maxlength: 60, placeholder: "e.g. Balcony & Outdoor", required: true })}
        ${textarea(f, "description", "Description", { maxlength: 300, rows: 3 })}
      </div>
      <div class="form-actions"><button class="btn btn-gold" type="submit">Create category</button></div>
    </form>
  </div>`);
}

export function banUsersPage(ctx: PageCtx, users: User[], filters: UserFilters): H {
  return page(ctx, `Users & bans · ${TITLE}`, html`
  <div class="page-head"><div><p class="eyebrow">Platform Management</p><h1>Users &amp; bans</h1>
    <p class="muted">Ban malicious users such as spam bots. A banned user is signed out immediately, cannot log in, and their projects are hidden.</p></div></div>
  ${userFilterBar("/platform/users", filters)}
  <div class="table-wrap"><table>
    <thead><tr><th>User</th><th>Role</th><th>Status</th><th style="min-width:320px">Action</th></tr></thead>
    <tbody>
      ${users.map((u) => {
        const bannable = u.role === "CUSTOMER" || u.role === "INTERIOR_DESIGNER";
        return html`<tr data-user="${u.id}" data-status="${u.status}">
          <td><strong>${u.fullName}</strong><span class="sub">@${u.username} &middot; joined ${fmtDate(u.createdAt)}</span></td>
          <td><span class="badge badge-role">${ROLE_LABELS[u.role]}</span></td>
          <td>${badge(u.status, ACCOUNT_STATUS_LABELS[u.status])}${u.statusReason ? html`<span class="sub">${u.statusReason}</span>` : ""}</td>
          <td>${!bannable
            ? html`<span class="muted small">Staff accounts cannot be banned</span>`
            : u.status === "BANNED"
              ? html`<form action="/platform/users/${u.id}/unban" method="post"><button class="btn btn-success btn-sm" type="submit">Lift ban</button></form>`
              : html`<form action="/platform/users/${u.id}/ban" method="post" class="row" style="gap:6px;flex-wrap:nowrap">
                  <input type="text" name="reason" maxlength="500" placeholder="Reason, e.g. spam bot" required aria-label="Reason">
                  <button class="btn btn-danger btn-sm" type="submit">Ban</button></form>`}</td>
        </tr>`;
      })}
      ${users.length ? "" : html`<tr><td colspan="4" class="empty">No users match.</td></tr>`}
    </tbody>
  </table></div>`);
}

export function ratingsPage(ctx: PageCtx, ratings: Rating[], summary: RatingSummary, topRated: RankedProject[]): H {
  return page(ctx, `Ratings · ${TITLE}`, html`
  <div class="page-head"><div><p class="eyebrow">Platform Management</p><h1>Rating system</h1>
    <p class="muted">Customers rate projects from 1 to 5 stars. Ratings give users an alternative measure of the products and services designers provide. Hide or delete abusive reviews here.</p></div></div>
  <div class="grid grid-3" style="margin-bottom:26px">
    <div class="stat"><div class="label">Average rating</div><div class="value">${avgText(summary)}</div><div class="note">${stars(avgStars(summary))}</div></div>
    <div class="stat"><div class="label">Visible ratings</div><div class="value">${summary.count}</div></div>
    <div class="stat"><div class="label">All ratings</div><div class="value">${ratings.length}</div></div>
  </div>
  <div class="split">
    <div class="table-wrap"><table>
      <thead><tr><th>Rating</th><th>Project</th><th>Customer</th><th></th></tr></thead>
      <tbody>
        ${ratings.map((r) => html`<tr data-rating="${r.id}" data-visible="${r.visible}">
          <td>${stars(r.score)}<span class="sub">${r.comment ?? "No review text"}</span>${r.visible ? "" : html` <span class="badge badge-hidden">Hidden</span>`}</td>
          <td><a href="/projects/${r.projectId}">${r.projectTitle}</a></td>
          <td>${r.customerName}<span class="sub">${fmtDate(r.createdAt)}</span></td>
          <td><div class="actions">
            ${r.visible
              ? html`<form class="inline" action="/platform/ratings/${r.id}/hide" method="post"><button class="btn btn-ghost btn-sm" type="submit">Hide</button></form>`
              : html`<form class="inline" action="/platform/ratings/${r.id}/show" method="post"><button class="btn btn-ghost btn-sm" type="submit">Show</button></form>`}
            <form class="inline" action="/platform/ratings/${r.id}/delete" method="post" onsubmit="return confirm('Delete this rating permanently?');"><button class="btn btn-danger btn-sm" type="submit">Delete</button></form>
          </div></td>
        </tr>`)}
        ${ratings.length ? "" : html`<tr><td colspan="4" class="empty">No ratings yet.</td></tr>`}
      </tbody>
    </table></div>
    <aside class="panel"><h3>Top rated projects</h3>${rankedList(topRated, "No ratings yet.", true)}</aside>
  </div>`);
}
