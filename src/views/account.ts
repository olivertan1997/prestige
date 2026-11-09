import { html } from "hono/html";
import { fmtDate, fmtDateTime } from "../lib/dates";
import {
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  ROLE_LABELS,
  type Issue,
  type IssueStatus,
  type Project,
  type User,
} from "../types";
import { badge, globalError, input, projectCard, select, textarea, type FormState } from "./components";
import { page, type H, type PageCtx } from "./layout";

const TITLE = "Prestige Interior Design";

export function profilePage(ctx: PageCtx, user: User, form: FormState, passwordForm: FormState): H {
  return page(ctx, `My profile · ${TITLE}`, html`
  <div class="page-head"><div>
    <p class="eyebrow">${ROLE_LABELS[user.role]}</p><h1>My profile</h1>
    <p class="muted">Member since ${fmtDate(user.createdAt)} &middot; username <strong>${user.username}</strong></p>
  </div></div>
  <div class="split">
    <form class="panel" action="/profile" method="post">
      <h3>Personal details</h3>
      ${globalError(form)}
      <div class="form-grid">
        ${input(form, "fullName", "Full name", { required: true })}
        ${input(form, "email", "Email", { type: "email", required: true })}
        ${input(form, "phone", "Phone")}
        ${textarea(form, "bio", "About me", { full: true, maxlength: 1000, placeholder: "Tell others a little about yourself" })}
      </div>
      <div class="form-actions"><button class="btn btn-dark" type="submit">Save profile</button></div>
    </form>
    <form class="panel" action="/profile/password" method="post">
      <h3>Change password</h3>
      ${globalError(passwordForm)}
      <div class="stack">
        ${input(passwordForm, "currentPassword", "Current password", { type: "password", autocomplete: "current-password", required: true })}
        ${input(passwordForm, "newPassword", "New password", { type: "password", autocomplete: "new-password", required: true })}
        ${input(passwordForm, "confirmPassword", "Confirm new password", { type: "password", autocomplete: "new-password", required: true })}
      </div>
      <p class="muted small" style="margin-top:12px">Passwords are stored only as a salted SHA-256 hash.</p>
      <div class="form-actions"><button class="btn btn-light" type="submit">Update password</button></div>
    </form>
  </div>`);
}

export function favouritesPage(ctx: PageCtx, favourites: (Project & { savedAt: Date })[]): H {
  return page(ctx, `My favourites · ${TITLE}`, html`
  <div class="page-head">
    <div><p class="eyebrow">Saved for reference</p><h1>My favourites</h1><p class="muted">${favourites.length} saved project(s)</p></div>
    <a class="btn btn-ghost" href="/projects">Find more projects</a>
  </div>
  ${favourites.length
    ? html`<div class="cards">${favourites.map((f) => html`<div class="stack">
        ${projectCard(f)}
        <div class="row between small" style="margin-top:8px">
          <span class="muted">Saved ${fmtDate(f.savedAt)}</span>
          <form class="inline" action="/customer/favourites/${f.id}/remove" method="post"><button class="btn btn-ghost btn-sm" type="submit">Remove</button></form>
        </div>
      </div>`)}</div>`
    : html`<div class="panel empty"><h3>No favourites yet</h3><p>Open any project and click <strong>Save to favourites</strong>.</p><a class="btn btn-gold" href="/projects">Browse projects</a></div>`}`);
}

const statusBadge = (s: IssueStatus) => badge(s, ISSUE_STATUS_LABELS[s]);

export function myIssuesPage(ctx: PageCtx, issues: Issue[], form: FormState): H {
  return page(ctx, `Report an issue · ${TITLE}`, html`
  <div class="page-head"><div><p class="eyebrow">Help us improve</p><h1>Report an issue</h1>
    <p class="muted">Tell us about a problem on the website. Our User Admin and Platform Management teams review every report and update its status.</p></div></div>
  <div class="split">
    <div>
      <h2>My reports</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Issue</th><th>Status</th><th>Response</th><th>Reported</th></tr></thead>
        <tbody>
          ${issues.map((i) => html`<tr data-issue="${i.id}" data-status="${i.status}">
            <td>${i.id}</td>
            <td><strong>${i.subject}</strong><span class="sub">${ISSUE_TYPE_LABELS[i.type]}</span></td>
            <td>${statusBadge(i.status)}</td>
            <td class="small">${i.resolutionNote ?? "-"}${i.resolvedAt ? html`<span class="sub">Rectified ${fmtDate(i.resolvedAt)}</span>` : ""}</td>
            <td class="small">${fmtDateTime(i.createdAt)}</td>
          </tr>`)}
          ${issues.length ? "" : html`<tr><td colspan="5" class="empty">You have not reported any issues.</td></tr>`}
        </tbody>
      </table></div>
    </div>
    <form class="panel" action="/issues" method="post">
      <h3>New report</h3>
      ${globalError(form)}
      <div class="stack">
        ${select(form, "type", "Type of issue", ISSUE_TYPES.map((t) => ({ value: t, label: ISSUE_TYPE_LABELS[t] })))}
        ${input(form, "subject", "Subject", { maxlength: 150, placeholder: "Short summary", required: true })}
        ${textarea(form, "description", "What happened?", { maxlength: 2000, placeholder: "Which page were you on? What did you expect to happen?" })}
      </div>
      <div class="form-actions"><button class="btn btn-dark" type="submit">Send report</button></div>
      <p class="muted small" style="margin-top:14px">Status flow: ${statusBadge("PENDING")} &rarr; ${statusBadge("REVIEWED")} &rarr; ${statusBadge("RECTIFIED")}</p>
    </form>
  </div>`);
}

export function manageIssuesPage(ctx: PageCtx, issues: Issue[], status: string, counts: Record<IssueStatus, number>): H {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return page(ctx, `Reported issues · ${TITLE}`, html`
  <div class="page-head"><div><p class="eyebrow">Moderation</p><h1>Reported issues</h1>
    <p class="muted">Reports flagged by users. Change the status so the reporter knows what is happening.</p></div></div>
  <div class="grid grid-4" style="margin-bottom:22px">
    <a class="stat" href="/issues/manage" style="color:inherit"><div class="label">All reports</div><div class="value">${total}</div></a>
    ${ISSUE_STATUSES.map((s) => html`<a class="stat" href="/issues/manage?status=${s}" style="color:inherit"><div class="label">${ISSUE_STATUS_LABELS[s]}</div><div class="value">${counts[s]}</div></a>`)}
  </div>
  <div class="tabs" style="margin-bottom:16px">
    <a href="/issues/manage" class="${status ? "" : "active"}">All</a>
    ${ISSUE_STATUSES.map((s) => html`<a href="/issues/manage?status=${s}" class="${status === s ? "active" : ""}">${ISSUE_STATUS_LABELS[s]}</a>`)}
  </div>
  <div class="table-wrap"><table>
    <thead><tr><th>#</th><th>Issue</th><th>Reported by</th><th>Status</th><th style="min-width:330px">Update</th></tr></thead>
    <tbody>
      ${issues.map((i) => html`<tr data-issue="${i.id}" data-status="${i.status}">
        <td>${i.id}</td>
        <td style="max-width:380px"><strong>${i.subject}</strong>
          <span class="sub">${ISSUE_TYPE_LABELS[i.type]} &middot; ${fmtDateTime(i.createdAt)}</span>
          <span class="sub" style="color:var(--ink-soft);white-space:pre-line">${i.description}</span></td>
        <td>${i.reporterName}<span class="sub">${ROLE_LABELS[i.reporterRole]}</span></td>
        <td>${statusBadge(i.status)}${i.handledByName ? html`<span class="sub">by ${i.handledByName}</span>` : ""}</td>
        <td>
          <form action="/issues/manage/${i.id}/status" method="post" class="stack" style="gap:6px">
            <div class="row" style="gap:6px">
              <select name="status" style="width:auto;flex:1" aria-label="Status">${ISSUE_STATUSES.map((s) => html`<option value="${s}"${i.status === s ? html` selected` : ""}>${ISSUE_STATUS_LABELS[s]}</option>`)}</select>
              <button class="btn btn-dark btn-sm" type="submit">Save</button>
            </div>
            <input type="text" name="note" maxlength="1000" value="${i.resolutionNote ?? ""}" placeholder="Message to the reporter (optional)" aria-label="Message">
          </form>
          ${i.status !== "RECTIFIED"
            ? html`<form action="/issues/manage/${i.id}/status" method="post" style="margin-top:6px"><input type="hidden" name="status" value="RECTIFIED"><button class="btn btn-success btn-sm" type="submit">&#10003; Mark as rectified</button></form>`
            : ""}
        </td>
      </tr>`)}
      ${issues.length ? "" : html`<tr><td colspan="5" class="empty">No reports here.</td></tr>`}
    </tbody>
  </table></div>`);
}
