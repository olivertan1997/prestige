import { describe, expect, it } from "vitest";
import { addDays, todayLocal } from "../src/lib/dates";
import { BusinessError } from "../src/lib/errors";
import { addSlot, buildCalendar, toggleSlot, type CalendarMonth } from "../src/services/availability";
import { asUser, location, newUser, useTestDb } from "./support";

describe("Feature 2: Customer sees a calendar view of an interior designer's availability", () => {
  const env = useTestDb();
  const find = (cal: CalendarMonth, date: string) => cal.weeks.flat().find((d) => d.date === date)!;

  it("A designer adds an available slot and it appears on the right calendar day", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const date = addDays(todayLocal(), 3);
    const res = await (await asUser(env, designer)).post("/designer/availability", { date, startTime: "10:00", endTime: "12:00" });
    expect(location(res)).toBe(`/designer/availability?month=${date.slice(0, 7)}`);
    const cal = await buildCalendar(env.db, designer.id, date.slice(0, 7));
    const day = find(cal, date);
    expect(day.slots).toHaveLength(1);
    expect(day.slots[0].status).toBe("AVAILABLE");
    expect(cal.weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("A customer sees the designer's calendar with the open time slots", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const date = addDays(todayLocal(), 5);
    await addSlot(env.db, designer.id, { date, startTime: "14:30", endTime: "16:45", note: "Consultation" });
    const res = await (await asUser(env, await newUser(env, "CUSTOMER"))).get(`/designers/${designer.id}?month=${date.slice(0, 7)}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("14:30-16:45");
    expect(html).toContain("1 open slot(s) this month");
  });

  it("Invalid slots (past date, end before start, overlapping) are rejected", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const date = addDays(todayLocal(), 2);
    await expect(addSlot(env.db, designer.id, { date: addDays(todayLocal(), -1), startTime: "10:00", endTime: "11:00" })).rejects.toBeInstanceOf(BusinessError);
    await expect(addSlot(env.db, designer.id, { date, startTime: "15:00", endTime: "14:00" })).rejects.toBeInstanceOf(BusinessError);
    await addSlot(env.db, designer.id, { date, startTime: "09:00", endTime: "12:00" });
    await expect(addSlot(env.db, designer.id, { date, startTime: "11:00", endTime: "13:00" })).rejects.toBeInstanceOf(BusinessError);
  });

  it("A booked slot is shown as booked so customers know it is taken", async () => {
    const designer = await newUser(env, "INTERIOR_DESIGNER");
    const date = addDays(todayLocal(), 4);
    const slot = await addSlot(env.db, designer.id, { date, startTime: "10:00", endTime: "11:00" });
    expect((await toggleSlot(env.db, designer.id, slot.id)).status).toBe("BOOKED");
    const day = find(await buildCalendar(env.db, designer.id, date.slice(0, 7)), date);
    expect(day.slots.map((s) => s.status)).toEqual(["BOOKED"]);
  });
});
