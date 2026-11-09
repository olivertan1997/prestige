import { Hono } from "hono";
import type { AppEnv } from "../env";
import { pageCtx } from "../lib/context";
import { BusinessError, clean } from "../lib/errors";
import { readForm, setFlash } from "../lib/http";
import { MIN_PASSWORD_LENGTH, changePassword, requireUser, updateOwnProfile } from "../services/users";
import type { User } from "../types";
import { profilePage } from "../views/account";
import { emptyForm, type FormState } from "../views/components";

// ---------------------------------------------------------------------- profile (any logged-in user)

export const accountRoutes = new Hono<AppEnv>();

const profileValues = (u: User) => ({ fullName: u.fullName, email: u.email, phone: u.phone, bio: u.bio });

accountRoutes.get("/profile", async (c) => {
  const user = await requireUser(c.get("db"), c.get("user")!.id);
  return c.html(profilePage(pageCtx(c), user, emptyForm(profileValues(user)), emptyForm()));
});

accountRoutes.post("/profile", async (c) => {
  const db = c.get("db");
  const me = c.get("user")!;
  const values = await readForm(c);
  const f: FormState = { values, errors: {} };
  if (!clean(values.fullName)) f.errors.fullName = "Full name is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(values.email) ?? "")) f.errors.email = "Enter a valid email address";
  if (!Object.keys(f.errors).length) {
    try {
      await updateOwnProfile(db, me.id, { fullName: values.fullName, email: values.email, phone: values.phone, bio: values.bio });
      setFlash(c, "success", "Your profile has been updated.");
      return c.redirect("/profile");
    } catch (e) {
      if (!(e instanceof BusinessError)) throw e;
      f.global = e.message;
    }
  }
  return c.html(profilePage(pageCtx(c), await requireUser(db, me.id), f, emptyForm()), 422);
});

accountRoutes.post("/profile/password", async (c) => {
  const db = c.get("db");
  const me = c.get("user")!;
  const values = await readForm(c);
  const f: FormState = { values, errors: {} };
  if (!values.currentPassword) f.errors.currentPassword = "Enter your current password";
  if ((values.newPassword ?? "").length < MIN_PASSWORD_LENGTH) f.errors.newPassword = `At least ${MIN_PASSWORD_LENGTH} characters`;
  if (values.newPassword !== values.confirmPassword) f.errors.confirmPassword = "Passwords do not match";
  if (!Object.keys(f.errors).length) {
    try {
      await changePassword(db, me.id, values.currentPassword, values.newPassword);
      setFlash(c, "success", "Your password has been changed.");
      return c.redirect("/profile");
    } catch (e) {
      if (!(e instanceof BusinessError)) throw e;
      f.global = e.message;
    }
  }
  const user = await requireUser(db, me.id);
  return c.html(profilePage(pageCtx(c), user, emptyForm(profileValues(user)), f), 422);
});
