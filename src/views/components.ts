import { html } from "hono/html";
import { fmtDate } from "../lib/dates";
import type { CalendarMonth } from "../services/availability";
import { PROJECT_STATUS_LABELS, type Project } from "../types";
import type { H } from "./layout";

export const money = (n: number | null | undefined) =>
  n === null || n === undefined ? "-" : "$" + Math.round(n).toLocaleString("en-US");

export function badge(kind: string, text: string): H {
  return html`<span class="badge badge-${kind.toLowerCase()}">${text}</span>`;
}

const EYE = html`<svg class="icon" viewBox="0 0 24 24"><path d="M12 5C6.5 5 2.7 9.4 1.5 12c1.2 2.6 5 7 10.5 7s9.3-4.4 10.5-7C21.3 9.4 17.5 5 12 5zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>`;
const HEART = html`<svg class="icon" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>`;

export const placeholderClass = (p: Pick<Project, "categoryId">) => `ph-${(p.categoryId ?? 0) % 6}`;

export function projectCard(p: Project, favIds?: Set<number> | null): H {
  return html`<article class="card project-card">
  <a class="thumb ${placeholderClass(p)}" href="/projects/${p.id}">
    ${p.imageUrl ? html`<img src="${p.imageUrl}" alt="${p.title}" loading="lazy">` : html`<span class="ph-letter">${p.title.slice(0, 1)}</span>`}
    <span class="badge ${p.status === "CURRENT" ? "badge-current" : "badge-past"}">${PROJECT_STATUS_LABELS[p.status]} project</span>
    ${favIds?.has(p.id) ? html`<span class="fav-flag">&#9829; Saved</span>` : ""}
  </a>
  <div class="card-body">
    <p class="eyebrow">${p.categoryName ?? "Uncategorised"}</p>
    <h3><a href="/projects/${p.id}">${p.title}</a></h3>
    <p class="muted small" style="margin:0">${p.designerName}${p.location ? ` · ${p.location}` : ""}</p>
    <div class="metrics">
      <span title="Views">${EYE}<b>${p.viewCount}</b> views</span>
      <span title="Times shortlisted">${HEART}<b>${p.shortlistCount}</b> shortlisted</span>
    </div>
  </div>
</article>`;
}

export function projectGrid(projects: Project[], favIds?: Set<number> | null, empty = "No projects yet."): H {
  return projects.length
    ? html`<div class="cards">${projects.map((p) => projectCard(p, favIds))}</div>`
    : html`<div class="panel empty">${empty}</div>`;
}

/** Month calendar of availability (story 2). */
export function calendar(cal: CalendarMonth, baseUrl: string): H {
  return html`<div class="calendar" id="calendar">
  <div class="cal-head">
    <a class="btn btn-ghost btn-sm" href="${baseUrl}?month=${cal.prev}#calendar">&lsaquo; Prev</a>
    <h3>${cal.label}</h3>
    <a class="btn btn-ghost btn-sm" href="${baseUrl}?month=${cal.next}#calendar">Next &rsaquo;</a>
  </div>
  <div class="cal-legend">
    <span><span class="dot available"></span>Available</span>
    <span><span class="dot booked"></span>Booked</span>
    <span>${cal.availableSlots} open slot(s) this month</span>
  </div>
  <div class="cal-grid">
    ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => html`<div class="cal-dow">${d}</div>`)}
    ${cal.weeks.flat().map((day) => {
      const classes = ["cal-day", day.inMonth ? "" : "out", day.today ? "today" : "", day.past ? "past" : "",
        !day.past && day.slots.some((s) => s.status === "AVAILABLE") ? "has-available" : ""].filter(Boolean).join(" ");
      return html`<div class="${classes}">
        <span class="num">${day.day}</span>
        ${day.slots.length
          ? html`<ul class="slots">${day.slots.map(
              (s) => html`<li class="${s.status === "AVAILABLE" ? "available" : "booked"}" title="${s.status === "AVAILABLE" ? "Available" : "Booked"}${s.note ? ` - ${s.note}` : ""}">${s.startTime}-${s.endTime}</li>`,
            )}</ul>`
          : ""}
      </div>`;
    })}
  </div>
</div>`;
}

// ------------------------------------------------------------------ forms

export interface FormState {
  values: Record<string, string | null | undefined>;
  errors: Record<string, string>;
  global?: string | null;
}

export const emptyForm = (values: Record<string, string | null | undefined> = {}): FormState => ({ values, errors: {} });

export function globalError(f: FormState): H {
  return f.global ? html`<div class="alert alert-error" role="alert">${f.global}</div>` : html``;
}

interface FieldOpts {
  type?: string;
  placeholder?: string;
  hint?: string;
  full?: boolean;
  required?: boolean;
  maxlength?: number;
  readonly?: boolean;
  min?: string;
  max?: string;
  step?: string;
  autocomplete?: string;
  keepValue?: boolean;
}

function wrap(f: FormState, name: string, label: string, control: H, opts: FieldOpts): H {
  const err = f.errors[name];
  return html`<div class="field${opts.full ? " full" : ""}${err ? " has-error" : ""}">
    <label for="${name}">${label}</label>
    ${control}
    ${opts.hint ? html`<span class="hint">${opts.hint}</span>` : ""}
    ${err ? html`<span class="error-text">${err}</span>` : ""}
  </div>`;
}

export function input(f: FormState, name: string, label: string, opts: FieldOpts = {}): H {
  const type = opts.type ?? "text";
  const value = type === "password" ? "" : (f.values[name] ?? "");
  return wrap(f, name, label, html`<input type="${type}" id="${name}" name="${name}" value="${value}"${opts.placeholder ? html` placeholder="${opts.placeholder}"` : ""}${opts.maxlength ? html` maxlength="${opts.maxlength}"` : ""}${opts.min ? html` min="${opts.min}"` : ""}${opts.max ? html` max="${opts.max}"` : ""}${opts.step ? html` step="${opts.step}"` : ""}${opts.autocomplete ? html` autocomplete="${opts.autocomplete}"` : ""}${opts.readonly ? html` readonly` : ""}${opts.required ? html` required` : ""}>`, opts);
}

export function textarea(f: FormState, name: string, label: string, opts: FieldOpts & { rows?: number } = {}): H {
  return wrap(f, name, label, html`<textarea id="${name}" name="${name}" rows="${opts.rows ?? 4}"${opts.maxlength ? html` maxlength="${opts.maxlength}"` : ""}${opts.placeholder ? html` placeholder="${opts.placeholder}"` : ""}>${f.values[name] ?? ""}</textarea>`, opts);
}

export function select(f: FormState, name: string, label: string, options: { value: string; label: string }[], opts: FieldOpts & { blank?: string } = {}): H {
  const current = f.values[name] ?? "";
  return wrap(f, name, label, html`<select id="${name}" name="${name}">
    ${opts.blank !== undefined ? html`<option value="">${opts.blank}</option>` : ""}
    ${options.map((o) => html`<option value="${o.value}"${o.value === current ? html` selected` : ""}>${o.label}</option>`)}
  </select>`, opts);
}

/** A select used in a GET filter bar (no form state). */
export function filterSelect(name: string, label: string, options: { value: string; label: string }[], current: string | null | undefined, blank: string): H {
  return html`<div class="field"><label for="${name}">${label}</label><select id="${name}" name="${name}">
    <option value="">${blank}</option>
    ${options.map((o) => html`<option value="${o.value}"${o.value === (current ?? "") ? html` selected` : ""}>${o.label}</option>`)}
  </select></div>`;
}

export const fmt = { date: fmtDate };
