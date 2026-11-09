// User Admin workspace: spec 1 and story 10.
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { pageCtx } from "../lib/context";
import { BusinessError, clean } from "../lib/errors";
import { backPath, intParam, readForm, setFlash } from "../lib/http";
import {
  MIN_PASSWORD_LENGTH,
  adminUpdateUser,
  countUsersByRole,
  createUser,
  disableUser,
  enableUser,
  listProfiles,
  requireUser,
  searchUsers,
  updateProfile,
} from "../services/users";
import { ROLES, isOneOf, type User } from "../types";
import { adminUserFormPage, adminUsersPage, profilesPage } from "../views/admin";
import { emptyForm, type FormState } from "../views/components";

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.get("/users", async (c) => {
  const filters = { q: c.req.query("q") ?? "", role: c.req.query("role") ?? "", status: c.req.query("status") ?? "" };
  return c.html(adminUsersPage(pageCtx(c), await searchUsers(c.get("db"), filters), filters));
});

function validateUserForm(v: Record<string, string>, creating: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (creating && !/^[A-Za-z0-9._-]{3,50}$/.test(clean(v.username) ?? "")) errors.username = "Use 3-50 letters, numbers, dots, dashes or underscores";
  if (!clean(v.fullName)) errors.fullName = "Full name is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v.email) ?? "")) errors.email = "Enter a valid email address";
  if (!isOneOf(ROLES, v.role)) errors.role = "Choose a role";
  if ((creating || v.password) && (v.password ?? "").length < MIN_PASSWORD_LENGTH) errors.password = `At least ${MIN_PASSWORD_LENGTH} characters`;
  return errors;
}

adminRoutes.get("/users/new", (c) => c.html(adminUserFormPage(pageCtx(c), emptyForm({ role: "CUSTOMER" }), null)));

adminRoutes.post("/users", async (c) => {
  const values = await readForm(c);
  const f: FormState = { values, errors: validateUserForm(values, true) };
  if (!Object.keys(f.errors).length) {
    try {
      const created = await createUser(c.get("db"), {
        username: values.username, email: values.email, fullName: values.fullName, password: values.password, role: values.role, phone: values.phone,
      });
      setFlash(c, "success", `Account '${created.username}' created.`);
      return c.redirect("/admin/users");
    } catch (e) {
      if (!(e instanceof BusinessError)) throw e;
      f.global = e.message;
    }
  }
  return c.html(adminUserFormPage(pageCtx(c), f, null), 422);
});

const userValues = (u: User) => ({ username: u.username, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role });

adminRoutes.get("/users/:id/edit", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const user = await requireUser(c.get("db"), id);
  return c.html(adminUserFormPage(pageCtx(c), emptyForm(userValues(user)), user));
});

adminRoutes.post("/users/:id", async (c) => {
  const db = c.get("db");
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const user = await requireUser(db, id);
  const values: Record<string, string> = { ...(await readForm(c)), username: user.username };
  const f: FormState = { values, errors: validateUserForm(values, false) };
  if (!Object.keys(f.errors).length) {
    try {
      await adminUpdateUser(db, c.get("user")!.id, id, {
        email: values.email, fullName: values.fullName, phone: values.phone, role: values.role, password: values.password,
      });
      setFlash(c, "success", "Account updated.");
      return c.redirect(`/admin/users/${id}/edit`);
    } catch (e) {
      if (!(e instanceof BusinessError)) throw e;
      f.global = e.message;
    }
  }
  return c.html(adminUserFormPage(pageCtx(c), f, user), 422);
});

/** Story 10 - disable without deleting any data. */
adminRoutes.post("/users/:id/disable", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const form = await readForm(c);
  const user = await disableUser(c.get("db"), c.get("user")!.id, id, form.reason);
  setFlash(c, "success", `'${user.username}' has been disabled. Their data is kept.`);
  return c.redirect(backPath(c, "/admin/users"));
});

adminRoutes.post("/users/:id/enable", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const user = await enableUser(c.get("db"), id);
  setFlash(c, "success", `'${user.username}' has been re-enabled.`);
  return c.redirect(backPath(c, "/admin/users"));
});

adminRoutes.get("/profiles", async (c) => {
  const db = c.get("db");
  const [profiles, counts] = await Promise.all([listProfiles(db), countUsersByRole(db)]);
  return c.html(profilesPage(pageCtx(c), profiles, counts));
});

adminRoutes.post("/profiles/:id", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const form = await readForm(c);
  const profile = await updateProfile(c.get("db"), id, form.name ?? "", form.description ?? null, form.active === "true");
  setFlash(c, "success", `Profile '${profile.name}' saved.`);
  return c.redirect("/admin/profiles");
});
