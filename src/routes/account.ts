import { Hono } from "hono";
import type { AppEnv } from "../env";
import { pageCtx } from "../lib/context";
import { BusinessError, clean } from "../lib/errors";
import { backPath, intParam, readForm, setFlash, type Ctx } from "../lib/http";
import { issueCounts, listIssues, myIssues, reportIssue, updateIssueStatus, validateIssue } from "../services/issues";
import { addFavourite, listFavourites, rateProject, removeFavourite } from "../services/projects";
import { MIN_PASSWORD_LENGTH, changePassword, requireUser, updateOwnProfile } from "../services/users";
import { ISSUE_STATUSES, ISSUE_STATUS_LABELS, isOneOf, type User } from "../types";
import { favouritesPage, manageIssuesPage, myIssuesPage, profilePage } from "../views/account";
import { emptyForm, type FormState } from "../views/components";

// ------------------------------------------------------------- profile + issues (any logged-in user)

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

// Story 3 - report an issue and follow its status
accountRoutes.get("/issues", async (c) => {
  const issues = await myIssues(c.get("db"), c.get("user")!.id);
  return c.html(myIssuesPage(pageCtx(c), issues, emptyForm({ type: "BUG" })));
});

accountRoutes.post("/issues", async (c) => {
  const db = c.get("db");
  const me = c.get("user")!;
  const values = await readForm(c);
  const f: FormState = { values, errors: validateIssue(values) };
  if (!Object.keys(f.errors).length) {
    await reportIssue(db, me.id, values);
    setFlash(c, "success", "Thank you - your report was sent. Its status is now Pending.");
    return c.redirect("/issues");
  }
  return c.html(myIssuesPage(pageCtx(c), await myIssues(db, me.id), f), 422);
});

// ------------------------------------------------- issue management (User Admin + Platform Management)

export const issueManagementRoutes = new Hono<AppEnv>();

issueManagementRoutes.get("/", async (c) => {
  const db = c.get("db");
  const status = isOneOf(ISSUE_STATUSES, c.req.query("status")) ? c.req.query("status")! : "";
  const [issues, counts] = await Promise.all([listIssues(db, status), issueCounts(db)]);
  return c.html(manageIssuesPage(pageCtx(c), issues, status, counts));
});

issueManagementRoutes.post("/:id/status", async (c) => {
  const id = intParam(c.req.param("id"));
  if (id === null) return c.notFound();
  const form = await readForm(c);
  const issue = await updateIssueStatus(c.get("db"), c.get("user")!.id, id, form.status ?? "", form.note);
  setFlash(c, "success", `Report #${id} is now ${ISSUE_STATUS_LABELS[issue.status]}.`);
  return c.redirect(backPath(c, "/issues/manage"));
});

// -------------------------------------------------------------- customer actions (stories 4 + 5)

export const customerRoutes = new Hono<AppEnv>();

customerRoutes.get("/favourites", async (c) => {
  return c.html(favouritesPage(pageCtx(c), await listFavourites(c.get("db"), c.get("user")!.id)));
});

function projectIdOrNull(c: Ctx): number | null {
  return intParam(c.req.param("projectId"));
}

customerRoutes.post("/favourites/:projectId", async (c) => {
  const projectId = projectIdOrNull(c);
  if (projectId === null) return c.notFound();
  const added = await addFavourite(c.get("db"), c.get("user")!.id, projectId);
  setFlash(c, "success", added ? "Saved to your favourites." : "This project is already in your favourites.");
  return c.redirect(backPath(c, `/projects/${projectId}`));
});

customerRoutes.post("/favourites/:projectId/remove", async (c) => {
  const projectId = projectIdOrNull(c);
  if (projectId === null) return c.notFound();
  await removeFavourite(c.get("db"), c.get("user")!.id, projectId);
  setFlash(c, "success", "Removed from your favourites.");
  return c.redirect(backPath(c, "/customer/favourites"));
});

customerRoutes.post("/ratings/:projectId", async (c) => {
  const projectId = projectIdOrNull(c);
  if (projectId === null) return c.notFound();
  const form = await readForm(c);
  const score = /^\d$/.test(form.score ?? "") ? Number(form.score) : NaN;
  await rateProject(c.get("db"), c.get("user")!.id, projectId, score, form.comment);
  setFlash(c, "success", "Thank you - your rating has been saved.");
  return c.redirect(`/projects/${projectId}#reviews`);
});
