import { html } from "hono/html";
import { fmtDate, fmtDateTime } from "../lib/dates";
import {
  ROLE_LABELS,
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
