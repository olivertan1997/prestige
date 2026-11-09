// Interior Designer workspace: spec 2 and stories 2, 9.
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { pageCtx } from "../lib/context";
import { parseMonth } from "../lib/dates";
import { BusinessError } from "../lib/errors";
import { backPath, intParam, readForm, setFlash } from "../lib/http";
import { addSlot, buildCalendar, deleteSlot, toggleSlot, upcomingSlots, validateSlot } from "../services/availability";
import { getCompany, saveCompany, validateCompany } from "../services/catalog";
import { userDirectory } from "../services/users";
import type { Company } from "../types";
import { emptyForm, type FormState } from "../views/components";
import { availabilityPage, companyPage, dashboardPage, directoryPage } from "../views/designer";

export const designerRoutes = new Hono<AppEnv>();

// --------------------------------------------------------------- dashboard

designerRoutes.get("/dashboard", async (c) => {
  const db = c.get("db");
  const id = c.get("user")!.id;
  const [company, slots] = await Promise.all([getCompany(db, id), upcomingSlots(db, id)]);
  return c.html(dashboardPage(pageCtx(c), { hasCompany: !!company, upcomingSlots: slots.length }));
});
designerRoutes.get("/", (c) => c.redirect("/designer/dashboard"));

// ----------------------------------------------------------------- company

const companyValues = (co: Company | null): Record<string, string | null> => ({
  name: co?.name ?? "",
  registrationNumber: co?.registrationNumber ?? null,
  description: co?.description ?? null,
  address: co?.address ?? null,
  phone: co?.phone ?? null,
  email: co?.email ?? null,
  website: co?.website ?? null,
  yearsInBusiness: co?.yearsInBusiness === null || co?.yearsInBusiness === undefined ? null : String(co.yearsInBusiness),
  specialties: co?.specialties ?? null,
});

designerRoutes.get("/company", async (c) => {
  const company = await getCompany(c.get("db"), c.get("user")!.id);
  return c.html(companyPage(pageCtx(c), emptyForm(companyValues(company)), !!company));
});

designerRoutes.post("/company", async (c) => {
  const db = c.get("db");
  const id = c.get("user")!.id;
  const values = await readForm(c);
  const f: FormState = { values, errors: validateCompany(values) };
  if (!Object.keys(f.errors).length) {
    await saveCompany(db, id, values);
    setFlash(c, "success", "Company information saved.");
    return c.redirect("/designer/company");
  }
  return c.html(companyPage(pageCtx(c), f, !!(await getCompany(db, id))), 422);
});

// ------------------------------------------------------------ availability

designerRoutes.get("/availability", async (c) => {
  const db = c.get("db");
  const id = c.get("user")!.id;
  const [cal, upcoming] = await Promise.all([buildCalendar(db, id, parseMonth(c.req.query("month"))), upcomingSlots(db, id)]);
  return c.html(availabilityPage(pageCtx(c), cal, upcoming, emptyForm()));
});

designerRoutes.post("/availability", async (c) => {
  const db = c.get("db");
  const id = c.get("user")!.id;
  const values = await readForm(c);
  const f: FormState = { values, errors: validateSlot(values) };
  if (!Object.keys(f.errors).length) {
    try {
      const slot = await addSlot(db, id, values);
      setFlash(c, "success", "Availability added.");
      return c.redirect(`/designer/availability?month=${slot.date.slice(0, 7)}`);
    } catch (e) {
      if (!(e instanceof BusinessError)) throw e;
      f.global = e.message;
    }
  }
  const month = parseMonth((values.date ?? "").slice(0, 7));
  const [cal, upcoming] = await Promise.all([buildCalendar(db, id, month), upcomingSlots(db, id)]);
  return c.html(availabilityPage(pageCtx(c), cal, upcoming, f), 422);
});

designerRoutes.post("/availability/:id/toggle", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  await toggleSlot(c.get("db"), c.get("user")!.id, id);
  setFlash(c, "success", "Slot updated.");
  return c.redirect(backPath(c, "/designer/availability"));
});

designerRoutes.post("/availability/:id/delete", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  await deleteSlot(c.get("db"), c.get("user")!.id, id);
  setFlash(c, "success", "Slot removed.");
  return c.redirect(backPath(c, "/designer/availability"));
});

// ------------------------------------------------------ user directory (story 9)

designerRoutes.get("/users", async (c) => {
  const role = c.req.query("role") ?? "";
  return c.html(directoryPage(pageCtx(c), await userDirectory(c.get("db"), role), role));
});
