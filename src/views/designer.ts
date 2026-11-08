import { html } from "hono/html";
import { fmtDate, fmtDayLong, todayLocal } from "../lib/dates";
import type { CalendarMonth } from "../services/availability";
import {
  type Slot,
} from "../types";
import { calendar, filterSelect, globalError, input, select, textarea, type FormState } from "./components";
import { page, type H, type PageCtx } from "./layout";

const TITLE = "Prestige Interior Design";

export interface DashboardView {
  hasCompany: boolean;
  upcomingSlots: number;
}

export function dashboardPage(ctx: PageCtx, v: DashboardView): H {
  return page(ctx, `Designer dashboard · ${TITLE}`, html`
  <div class="page-head">
    <div><p class="eyebrow">Interior designer</p><h1>Designer dashboard</h1>
      <p class="muted">Your company profile and the time slots customers can book with you.</p></div>
  </div>
  ${v.hasCompany ? "" : html`<div class="alert alert-info">Customers trust studios with complete profiles. <a href="/designer/company">Add your company information &rarr;</a></div>`}
  <div class="grid grid-4" style="margin-bottom:26px">
    <div class="stat"><div class="label">Upcoming slots</div><div class="value">${v.upcomingSlots}</div><div class="note"><a href="/designer/availability">Manage availability</a></div></div>
  </div>`);
}

export function companyPage(ctx: PageCtx, f: FormState, hasCompany: boolean): H {
  return page(ctx, `Company information · ${TITLE}`, html`
  <div class="page-head">
    <div><p class="eyebrow">Interior designer</p><h1>Company information</h1><p class="muted">This appears on your public designer page and next to each of your projects.</p></div>
    ${hasCompany && ctx.user ? html`<a class="btn btn-ghost" href="/designers/${ctx.user.id}">View public page</a>` : ""}
  </div>
  <form class="panel" action="/designer/company" method="post">
    ${globalError(f)}
    <div class="form-grid">
      ${input(f, "name", "Company name *", { required: true, maxlength: 120 })}
      ${input(f, "registrationNumber", "Registration number (UEN)", { maxlength: 40 })}
      ${textarea(f, "description", "About the company", { full: true, maxlength: 2000 })}
      ${input(f, "specialties", "Specialties", { placeholder: "e.g. Japandi, HDB renovation, offices" })}
      ${input(f, "yearsInBusiness", "Years in business", { type: "number", min: "0", max: "200" })}
      ${input(f, "address", "Address", { full: true })}
      ${input(f, "phone", "Phone")}
      ${input(f, "email", "Business email", { type: "email" })}
      ${input(f, "website", "Website", { type: "url", placeholder: "https://", full: true })}
    </div>
    <div class="form-actions"><button class="btn btn-dark" type="submit">${hasCompany ? "Save changes" : "Create company profile"}</button></div>
  </form>`);
}

export function availabilityPage(ctx: PageCtx, cal: CalendarMonth, upcoming: Slot[], f: FormState): H {
  return page(ctx, `Availability · ${TITLE}`, html`
  <div class="page-head"><div><p class="eyebrow">Interior designer</p><h1>My availability</h1>
    <p class="muted">Customers see this calendar on your public page so they know when to schedule renovations with you.</p></div></div>
  <div class="split">
    ${calendar(cal, "/designer/availability")}
    <aside class="stack">
      <form class="panel" action="/designer/availability" method="post">
        <h3>Add an available slot</h3>
        ${globalError(f)}
        <div class="stack">
          ${input(f, "date", "Date", { type: "date", min: todayLocal(), required: true })}
          <div class="row" style="gap:10px;flex-wrap:nowrap">
            ${input(f, "startTime", "From", { type: "time", required: true })}
            ${input(f, "endTime", "To", { type: "time", required: true })}
          </div>
          ${input(f, "note", "Note", { maxlength: 200, placeholder: "e.g. Site visit / consultation" })}
        </div>
        <div class="form-actions"><button class="btn btn-dark" type="submit">Add slot</button></div>
      </form>
    </aside>
  </div>
  <h2 style="margin-top:34px">Upcoming slots</h2>
  <div class="table-wrap"><table>
    <thead><tr><th>Date</th><th>Time</th><th>Status</th><th>Note</th><th></th></tr></thead>
    <tbody>
      ${upcoming.map((s) => html`<tr data-slot="${s.id}" data-status="${s.status}">
        <td>${fmtDayLong(s.date)}</td>
        <td>${s.startTime} - ${s.endTime}</td>
        <td><span class="badge ${s.status === "AVAILABLE" ? "badge-available" : "badge-booked"}">${s.status === "AVAILABLE" ? "Available" : "Booked"}</span></td>
        <td class="small">${s.note ?? "-"}</td>
        <td><div class="actions">
          <form class="inline" action="/designer/availability/${s.id}/toggle" method="post"><button class="btn btn-ghost btn-sm" type="submit">${s.status === "AVAILABLE" ? "Mark booked" : "Mark available"}</button></form>
          <form class="inline" action="/designer/availability/${s.id}/delete" method="post"><button class="btn btn-danger btn-sm" type="submit">Remove</button></form>
        </div></td>
      </tr>`)}
      ${upcoming.length ? "" : html`<tr><td colspan="5" class="empty">No upcoming slots. Add one with the form above.</td></tr>`}
    </tbody>
  </table></div>`);
}
