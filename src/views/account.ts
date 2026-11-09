import { html } from "hono/html";
import { fmtDate, fmtDateTime } from "../lib/dates";
import {
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
