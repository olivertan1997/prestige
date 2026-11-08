// Date helpers. Reports and calendars use Singapore time (UTC+8, no daylight saving time).

export const TIME_ZONE_LABEL = "Singapore time";
const OFFSET_HOURS = 8;
const OFFSET_MS = OFFSET_HOURS * 3600 * 1000;

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in Singapore as YYYY-MM-DD. */
export function todayLocal(now: Date = new Date()): string {
  return new Date(now.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** The instant of midnight (Singapore time) at the start of the given YYYY-MM-DD. */
export function localMidnight(date: string): Date {
  return new Date(`${date}T00:00:00+0${OFFSET_HOURS}:00`);
}

export function isValidDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isValidTime(value: string | null | undefined): value is string {
  return !!value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number): string {
  const d = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** 0 = Monday ... 6 = Sunday */
export function mondayIndex(date: string): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export function lastDayOfMonth(month: string): string {
  return addDays(addMonths(`${month}-01`, 1), -1);
}

export function currentMonth(now: Date = new Date()): string {
  return todayLocal(now).slice(0, 7);
}

/** Parses "2026-11"; falls back to the current month for missing or invalid input. */
export function parseMonth(value: string | null | undefined): string {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  return currentMonth();
}

function localParts(d: Date) {
  const s = new Date(d.getTime() + OFFSET_MS);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth(), day: s.getUTCDate(), h: s.getUTCHours(), min: s.getUTCMinutes(), dow: s.getUTCDay() };
}

function dateParts(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate(), dow: d.getUTCDay() };
}

/** "7 Nov 2026" for a timestamp (Singapore time) or a YYYY-MM-DD date. */
export function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const p = typeof value === "string" ? dateParts(value) : localParts(value);
  return `${p.day} ${MONTHS_SHORT[p.m]} ${p.y}`;
}

/** "Sat 7 Nov 2026" */
export function fmtDayLong(value: Date | string): string {
  const p = typeof value === "string" ? dateParts(value) : localParts(value);
  return `${WEEKDAYS[p.dow]} ${p.day} ${MONTHS_SHORT[p.m]} ${p.y}`;
}

/** "7 Nov 2026, 14:05" (Singapore time) */
export function fmtDateTime(value: Date | null | undefined): string {
  if (!value) return "-";
  const p = localParts(value);
  return `${p.day} ${MONTHS_SHORT[p.m]} ${p.y}, ${pad(p.h)}:${pad(p.min)}`;
}

/** "Nov 2026" for a YYYY-MM-DD date */
export function fmtMonthShort(date: string | null | undefined): string {
  if (!date) return "-";
  const p = dateParts(date);
  return `${MONTHS_SHORT[p.m]} ${p.y}`;
}

/** "November 2026" for YYYY-MM or YYYY-MM-DD */
export function fmtMonthLong(month: string): string {
  const p = dateParts(`${month.slice(0, 7)}-01`);
  return `${MONTHS_LONG[p.m]} ${p.y}`;
}

export function year(now: Date = new Date()): number {
  return localParts(now).y;
}
