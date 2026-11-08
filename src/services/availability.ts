// Story 2 - calendar view of an Interior Designer's availability.
import { one, type Db } from "../db";
import { addDays, fmtMonthLong, isValidDate, isValidTime, lastDayOfMonth, addMonths, mondayIndex, todayLocal } from "../lib/dates";
import { BusinessError, NotFoundError, clean } from "../lib/errors";
import type { Slot } from "../types";
import { requireUser } from "./users";

const SLOT_COLS = `id, designer_id as "designerId", slot_date::text as date, to_char(start_time, 'HH24:MI') as "startTime",
  to_char(end_time, 'HH24:MI') as "endTime", status, note`;

export interface SlotInput {
  date?: string;
  startTime?: string;
  endTime?: string;
  note?: string;
}

export function validateSlot(input: SlotInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isValidDate(clean(input.date))) errors.date = "Pick a date";
  else if (input.date!.trim() < todayLocal()) errors.date = "You cannot add availability in the past";
  if (!isValidTime(clean(input.startTime))) errors.startTime = "Pick a start time";
  if (!isValidTime(clean(input.endTime))) errors.endTime = "Pick an end time";
  else if (isValidTime(clean(input.startTime)) && input.endTime!.trim() <= input.startTime!.trim()) {
    errors.endTime = "The end time must be after the start time";
  }
  if ((clean(input.note) ?? "").length > 200) errors.note = "At most 200 characters";
  return errors;
}

export async function addSlot(db: Db, designerId: number, input: SlotInput): Promise<Slot> {
  const designer = await requireUser(db, designerId);
  if (designer.role !== "INTERIOR_DESIGNER") throw new BusinessError("Only Interior Designers have an availability calendar.");
  const errors = validateSlot(input);
  const first = Object.values(errors)[0];
  if (first) throw new BusinessError(first + ".");
  const date = input.date!.trim();
  const start = input.startTime!.trim();
  const end = input.endTime!.trim();
  const clash = await one<{ startTime: string; endTime: string }>(
    db,
    `select to_char(start_time, 'HH24:MI') as "startTime", to_char(end_time, 'HH24:MI') as "endTime" from availability_slots
      where designer_id = $1::int and slot_date = $2::date and start_time < $4::time and end_time > $3::time limit 1`,
    [designerId, date, start, end],
  );
  if (clash) throw new BusinessError(`This overlaps an existing slot (${clash.startTime} - ${clash.endTime}).`);
  const slot = await one<Slot>(
    db,
    `insert into availability_slots (designer_id, slot_date, start_time, end_time, note)
     values ($1::int, $2::date, $3::time, $4::time, $5) returning ${SLOT_COLS}`,
    [designerId, date, start, end, clean(input.note)],
  );
  return slot!;
}

async function ownedSlot(db: Db, designerId: number, slotId: number): Promise<Slot> {
  const slot = await one<Slot>(db, `select ${SLOT_COLS} from availability_slots where id = $1::int and designer_id = $2::int`, [slotId, designerId]);
  if (!slot) throw new NotFoundError("Slot not found");
  return slot;
}

export async function deleteSlot(db: Db, designerId: number, slotId: number): Promise<void> {
  await ownedSlot(db, designerId, slotId);
  await db.query(`delete from availability_slots where id = $1::int`, [slotId]);
}

/** Marks a slot as booked (e.g. after agreeing a renovation date) or back to available. */
export async function toggleSlot(db: Db, designerId: number, slotId: number): Promise<Slot> {
  const slot = await ownedSlot(db, designerId, slotId);
  const next = slot.status === "AVAILABLE" ? "BOOKED" : "AVAILABLE";
  return (await one<Slot>(db, `update availability_slots set status = $2 where id = $1::int returning ${SLOT_COLS}`, [slotId, next]))!;
}

export function upcomingSlots(db: Db, designerId: number): Promise<Slot[]> {
  return db.query<Slot>(
    `select ${SLOT_COLS} from availability_slots where designer_id = $1::int and slot_date >= $2::date order by slot_date, start_time, id`,
    [designerId, todayLocal()],
  );
}

export interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  today: boolean;
  past: boolean;
  slots: Slot[];
}

export interface CalendarMonth {
  month: string; // YYYY-MM
  label: string;
  prev: string;
  next: string;
  weeks: CalendarDay[][];
  availableSlots: number;
  bookedSlots: number;
}

/** Builds a Monday-first month grid containing the designer's slots. */
export async function buildCalendar(db: Db, designerId: number, month: string): Promise<CalendarMonth> {
  const first = `${month}-01`;
  const last = lastDayOfMonth(month);
  const gridStart = addDays(first, -mondayIndex(first));
  const gridEnd = addDays(last, 6 - mondayIndex(last));
  const slots = await db.query<Slot>(
    `select ${SLOT_COLS} from availability_slots where designer_id = $1::int and slot_date between $2::date and $3::date
      order by slot_date, start_time, id`,
    [designerId, gridStart, gridEnd],
  );
  const byDate = new Map<string, Slot[]>();
  for (const slot of slots) byDate.set(slot.date, [...(byDate.get(slot.date) ?? []), slot]);

  const today = todayLocal();
  const weeks: CalendarDay[][] = [];
  let week: CalendarDay[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
    week.push({ date: d, day: Number(d.slice(8)), inMonth: d.startsWith(month), today: d === today, past: d < today, slots: byDate.get(d) ?? [] });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  const inMonth = slots.filter((s) => s.date.startsWith(month));
  return {
    month,
    label: fmtMonthLong(month),
    prev: addMonths(first, -1).slice(0, 7),
    next: addMonths(first, 1).slice(0, 7),
    weeks,
    availableSlots: inMonth.filter((s) => s.status === "AVAILABLE").length,
    bookedSlots: inMonth.filter((s) => s.status === "BOOKED").length,
  };
}
