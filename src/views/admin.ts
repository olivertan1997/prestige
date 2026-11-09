import { html } from "hono/html";
import { fmtDate, fmtDateTime } from "../lib/dates";
import { ACCOUNT_STATUSES, ACCOUNT_STATUS_LABELS, ROLES, ROLE_LABELS, type Role, type User, type UserProfile } from "../types";
import { badge, filterSelect, globalError, input, select, type FormState } from "./components";
import { page, type H, type PageCtx } from "./layout";

const TITLE = "Prestige Interior Design";
const roleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
const statusOptions = ACCOUNT_STATUSES.map((s) => ({ value: s, label: ACCOUNT_STATUS_LABELS[s] }));

export interface UserFilters {
  q: string;
  role: string;
  status: string;
}

export function userFilterBar(action: string, f: UserFilters): H {
  return html`<form class="filters" action="${action}" method="get">
    <div class="field grow"><label for="q">Name</label><input type="search" id="q" name="q" value="${f.q}" placeholder="Search by name or username"></div>
    ${filterSelect("role", "Role", roleOptions, f.role, "All roles")}
    ${filterSelect("status", "Status", statusOptions, f.status, "Any status")}
    <button class="btn btn-dark" type="submit">Filter</button><a class="btn btn-ghost" href="${action}">Reset</a>
  </form>`;
}

export function adminUsersPage(ctx: PageCtx, users: User[], filters: UserFilters): H {
  const me = ctx.user?.id;
  return page(ctx, `User accounts · ${TITLE}`, html`
  <div class="page-head">
    <div><p class="eyebrow">User Admin</p><h1>User accounts</h1><p class="muted">Create, view, update, search and disable accounts. Disabling keeps all of the user's data.</p></div>
    <a class="btn btn-gold" href="/admin/users/new">+ New account</a>
  </div>
  ${userFilterBar("/admin/users", filters)}
  <p class="muted small">${users.length} account(s)</p>
  <div class="table-wrap"><table>
    <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Email</th><th>Last login</th><th></th></tr></thead>
    <tbody>
      ${users.map((u) => html`<tr data-user="${u.id}" data-role="${u.role}" data-status="${u.status}">
        <td><strong>${u.fullName}</strong><span class="sub">@${u.username}</span></td>
        <td><span class="badge badge-role">${ROLE_LABELS[u.role]}</span></td>
        <td>${badge(u.status, ACCOUNT_STATUS_LABELS[u.status])}${u.statusReason ? html`<span class="sub">${u.statusReason}</span>` : ""}</td>
        <td class="small">${u.email}</td>
        <td class="small">${u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "never"}</td>
        <td><div class="actions">
          <a class="btn btn-ghost btn-sm" href="/admin/users/${u.id}/edit">View / edit</a>
          ${u.status === "ACTIVE" && u.id !== me
            ? html`<form class="inline" action="/admin/users/${u.id}/disable" method="post" onsubmit="return confirm('Disable this account? The user will be signed out but no data is deleted.');"><button class="btn btn-danger btn-sm" type="submit">Disable</button></form>`
            : ""}
          ${u.status === "DISABLED" ? html`<form class="inline" action="/admin/users/${u.id}/enable" method="post"><button class="btn btn-success btn-sm" type="submit">Enable</button></form>` : ""}
        </div></td>
      </tr>`)}
      ${users.length ? "" : html`<tr><td colspan="6" class="empty">No accounts match.</td></tr>`}
    </tbody>
  </table></div>`);
}

export function adminUserFormPage(ctx: PageCtx, f: FormState, user: User | null): H {
  const isMe = user && ctx.user?.id === user.id;
  return page(ctx, `${user ? user.fullName : "New account"} · ${TITLE}`, html`
  <p class="small"><a href="/admin/users">&larr; All accounts</a></p>
  <div class="page-head"><div><p class="eyebrow">User Admin</p><h1>${user ? user.fullName : "New account"}</h1>
    ${user ? html`<p class="muted"><span class="badge badge-role">${ROLE_LABELS[user.role]}</span> ${badge(user.status, ACCOUNT_STATUS_LABELS[user.status])} &middot; joined ${fmtDate(user.createdAt)}</p>` : ""}
  </div></div>
  <div class="split">
    <form class="panel" action="${user ? `/admin/users/${user.id}` : "/admin/users"}" method="post">
      <h3>Account details</h3>
      ${globalError(f)}
      <div class="form-grid">
        ${input(f, "username", "Username", { readonly: !!user, hint: user ? "Usernames cannot be changed." : "3-50 letters, numbers, dots, dashes or underscores", required: !user })}
        ${select(f, "role", "Role (user profile)", roleOptions)}
        ${input(f, "fullName", "Full name", { required: true })}
        ${input(f, "email", "Email", { type: "email", required: true })}
        ${input(f, "phone", "Phone")}
        ${input(f, "password", user ? "New password (optional)" : "Password", { type: "password", autocomplete: "new-password", required: !user, hint: "At least 8 characters. Stored as a salted SHA-256 hash." })}
      </div>
      <div class="form-actions"><button class="btn btn-dark" type="submit">${user ? "Save changes" : "Create account"}</button><a class="btn btn-ghost" href="/admin/users">Cancel</a></div>
    </form>
    ${user
      ? html`<aside class="panel">
          <h3>Account status</h3>
          ${user.status === "ACTIVE"
            ? isMe
              ? html`<p class="muted small">This is your own account.</p>`
              : html`<p class="muted small">Disabling stops the account from being used (the user is signed out immediately) without deleting any of their data.</p>
                <form action="/admin/users/${user.id}/disable" method="post" class="stack">
                  <div class="field"><label for="reason">Reason (optional)</label><input type="text" id="reason" name="reason" maxlength="500" placeholder="e.g. Suspicious activity"></div>
                  <button class="btn btn-danger" type="submit">Disable account</button>
                </form>`
            : user.status === "DISABLED"
              ? html`<p>This account is <strong>disabled</strong>${user.statusReason ? `: ${user.statusReason}` : ""}.</p>
                <form action="/admin/users/${user.id}/enable" method="post"><button class="btn btn-success" type="submit">Re-enable account</button></form>`
              : html`<p>This account was <strong>banned</strong> by Platform Management${user.statusReason ? `: ${user.statusReason}` : ""}.</p><p class="muted small">Only Platform Management can lift a ban.</p>`}
          <hr class="soft">
          <dl class="kv small"><dt>Last login</dt><dd>${user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : "never"}</dd><dt>Bio</dt><dd>${user.bio ?? "-"}</dd></dl>
        </aside>`
      : ""}
  </div>`);
}

export function profilesPage(ctx: PageCtx, profiles: UserProfile[], counts: Record<Role, number>): H {
  return page(ctx, `User profiles · ${TITLE}`, html`
  <div class="page-head"><div><p class="eyebrow">User Admin</p><h1>User profiles</h1>
    <p class="muted">The four types of account on the platform. Suspending a profile stops every account of that type from logging in.</p></div></div>
  <div class="grid grid-2">
    ${profiles.map((p) => html`<form class="panel" action="/admin/profiles/${p.id}" method="post" data-profile="${p.role}">
      <div class="row between"><span class="badge badge-role">${ROLE_LABELS[p.role]}</span>${p.active ? badge("active", "Active") : badge("disabled", "Suspended")}</div>
      <div class="stack" style="margin-top:14px">
        <div class="field"><label for="name${p.id}">Profile name</label><input type="text" id="name${p.id}" name="name" value="${p.name}" maxlength="60" required></div>
        <div class="field"><label for="desc${p.id}">Description</label><textarea id="desc${p.id}" name="description" maxlength="500" rows="3">${p.description ?? ""}</textarea></div>
        ${p.role === "USER_ADMIN"
          ? html`<input type="hidden" name="active" value="true"><p class="muted small">The User Admin profile is always active.</p>`
          : html`<label class="check"><input type="checkbox" name="active" value="true"${p.active ? html` checked` : ""}> Profile is active (accounts of this type can log in)</label>`}
      </div>
      <div class="row between" style="margin-top:14px"><span class="muted small">${counts[p.role]} account(s)</span><button class="btn btn-dark btn-sm" type="submit">Save profile</button></div>
    </form>`)}
  </div>`);
}
