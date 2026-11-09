// Spec 1 - user accounts and user profiles; stories 9 (filter by role) and 10 (disable).
import { one, type Db } from "../db";
import { BusinessError, NotFoundError, clean, escapeLike, isBlank } from "../lib/errors";
import { hashPassword, verifyPassword } from "../lib/password";
import { destroyRoleSessions, destroyUserSessions } from "../lib/sessions";
import {
  ACCOUNT_STATUSES,
  ROLES,
  ROLE_LABELS,
  SELF_SERVICE_ROLES,
  isOneOf,
  type AccountStatus,
  type Role,
  type User,
  type UserProfile,
} from "../types";

export const MIN_PASSWORD_LENGTH = 8;
const USERNAME_RE = /^[a-z0-9._-]{3,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const USER_COLS = `id, username, email, full_name as "fullName", password_hash as "passwordHash", role, status,
  status_reason as "statusReason", phone, bio, created_at as "createdAt", last_login_at as "lastLoginAt"`;

export async function getUser(db: Db, id: number): Promise<User | null> {
  return one<User>(db, `select ${USER_COLS} from user_accounts where id = $1::int`, [id]);
}

export async function requireUser(db: Db, id: number): Promise<User> {
  const user = await getUser(db, id);
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function findUserByUsername(db: Db, username: string): Promise<User | null> {
  return one<User>(db, `select ${USER_COLS} from user_accounts where lower(username) = lower($1)`, [username.trim()]);
}

// ---------------------------------------------------------------- create / update

export interface NewUserInput {
  username: string;
  email: string;
  fullName: string;
  password: string;
  role: Role | string;
  phone?: string | null;
}

function checkPassword(password: unknown): asserts password is string {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new BusinessError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password.length > 100) throw new BusinessError("Password is too long (maximum 100 characters).");
}

function checkEmail(email: string | null): string {
  if (!email) throw new BusinessError("Email is required.");
  const lower = email.toLowerCase();
  if (!EMAIL_RE.test(lower) || lower.length > 120) throw new BusinessError("Enter a valid email address.");
  return lower;
}

function checkFullName(name: string | null): string {
  if (!name) throw new BusinessError("Full name is required.");
  if (name.length > 100) throw new BusinessError("Full name can be at most 100 characters.");
  return name;
}

export async function createUser(db: Db, input: NewUserInput): Promise<User> {
  const username = (clean(input.username) ?? "").toLowerCase();
  if (!USERNAME_RE.test(username)) {
    throw new BusinessError("Username must be 3-50 characters: letters, numbers, dots, dashes or underscores.");
  }
  const email = checkEmail(clean(input.email));
  const fullName = checkFullName(clean(input.fullName));
  if (!isOneOf(ROLES, input.role)) throw new BusinessError("Choose a role for the account.");
  checkPassword(input.password);

  if (await one(db, `select 1 from user_accounts where lower(username) = $1`, [username])) {
    throw new BusinessError(`The username '${username}' is already taken.`);
  }
  if (await one(db, `select 1 from user_accounts where lower(email) = $1`, [email])) {
    throw new BusinessError("An account with this email already exists.");
  }
  const passwordHash = await hashPassword(input.password);
  const created = await one<User>(
    db,
    `insert into user_accounts (username, email, full_name, password_hash, role, phone)
     values ($1, $2, $3, $4, $5, $6) returning ${USER_COLS}`,
    [username, email, fullName, passwordHash, input.role, clean(input.phone)],
  );
  return created!;
}

/** Visitors can sign up as a Customer or an Interior Designer only. */
export async function registerUser(db: Db, input: NewUserInput): Promise<User> {
  if (!isOneOf(SELF_SERVICE_ROLES, input.role)) {
    throw new BusinessError("You can only sign up as a Customer or an Interior Designer.");
  }
  return createUser(db, input);
}

export interface AdminUserInput {
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
  password?: string | null;
}

export async function adminUpdateUser(db: Db, actorId: number, userId: number, input: AdminUserInput): Promise<User> {
  const user = await requireUser(db, userId);
  if (!isOneOf(ROLES, input.role)) throw new BusinessError("Choose a role for the account.");
  if (user.id === actorId && input.role !== "USER_ADMIN") {
    throw new BusinessError("You cannot remove your own User Admin role.");
  }
  const email = checkEmail(clean(input.email));
  const fullName = checkFullName(clean(input.fullName));
  if (await one(db, `select 1 from user_accounts where lower(email) = $1 and id <> $2::int`, [email, userId])) {
    throw new BusinessError("Another account already uses this email.");
  }
  let passwordHash = user.passwordHash;
  if (!isBlank(input.password)) {
    checkPassword(input.password);
    passwordHash = await hashPassword(input.password);
  }
  const updated = await one<User>(
    db,
    `update user_accounts set email = $2, full_name = $3, phone = $4, role = $5, password_hash = $6
      where id = $1::int returning ${USER_COLS}`,
    [userId, email, fullName, clean(input.phone), input.role, passwordHash],
  );
  if (input.role !== user.role) await destroyUserSessions(db, userId); // permissions changed: sign in again
  return updated!;
}

export interface ProfileInput {
  fullName: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
}

export async function updateOwnProfile(db: Db, userId: number, input: ProfileInput): Promise<User> {
  await requireUser(db, userId);
  const email = checkEmail(clean(input.email));
  const fullName = checkFullName(clean(input.fullName));
  const bio = clean(input.bio);
  if (bio && bio.length > 1000) throw new BusinessError("Bio can be at most 1000 characters.");
  if (await one(db, `select 1 from user_accounts where lower(email) = $1 and id <> $2::int`, [email, userId])) {
    throw new BusinessError("Another account already uses this email.");
  }
  const updated = await one<User>(
    db,
    `update user_accounts set full_name = $2, email = $3, phone = $4, bio = $5 where id = $1::int returning ${USER_COLS}`,
    [userId, fullName, email, clean(input.phone), bio],
  );
  return updated!;
}

export async function changePassword(db: Db, userId: number, current: string, next: string): Promise<void> {
  const user = await requireUser(db, userId);
  if (!(await verifyPassword(current, user.passwordHash))) throw new BusinessError("Your current password is incorrect.");
  checkPassword(next);
  await db.query(`update user_accounts set password_hash = $2 where id = $1::int`, [userId, await hashPassword(next)]);
}

// ------------------------------------------------------------------------ login

export type LoginResult = { ok: true; user: User } | { ok: false; reason: "error" | "disabled" };

export async function authenticate(db: Db, username: string, password: string): Promise<LoginResult> {
  const user = username ? await findUserByUsername(db, username) : null;
  if (!user) {
    await hashPassword(password || "x"); // similar timing whether or not the user exists
    return { ok: false, reason: "error" };
  }
  if (!(await verifyPassword(password, user.passwordHash))) return { ok: false, reason: "error" };
  if (user.status === "DISABLED" || !(await isProfileActive(db, user.role))) return { ok: false, reason: "disabled" };
  await db.query(`update user_accounts set last_login_at = now() where id = $1::int`, [user.id]);
  return { ok: true, user };
}

// ------------------------------------------------------------------- disable

/** Story 10 - User Admin disables an account. All of the user's data is kept. */
export async function disableUser(db: Db, actorId: number, targetId: number, reason?: string | null): Promise<User> {
  const target = await requireUser(db, targetId);
  if (target.id === actorId) throw new BusinessError("You cannot disable your own account.");
  if (target.status === "DISABLED") throw new BusinessError("This account is already disabled.");
  return setStatus(db, targetId, "DISABLED", clean(reason));
}

export async function enableUser(db: Db, targetId: number): Promise<User> {
  const target = await requireUser(db, targetId);
  if (target.status !== "DISABLED") throw new BusinessError("Only disabled accounts can be re-enabled.");
  return setStatus(db, targetId, "ACTIVE", null);
}

async function setStatus(db: Db, userId: number, status: AccountStatus, reason: string | null): Promise<User> {
  const updated = await one<User>(
    db,
    `update user_accounts set status = $2, status_reason = $3 where id = $1::int returning ${USER_COLS}`,
    [userId, status, reason],
  );
  if (status !== "ACTIVE") await destroyUserSessions(db, userId); // signed out everywhere immediately
  return updated!;
}

// --------------------------------------------------------------------- search

export interface UserSearch {
  q?: string | null;
  role?: string | null;
  status?: string | null;
}

/** Spec 1 + story 9: partial, case-insensitive name/username search, optional role and status filters. */
export async function searchUsers(db: Db, search: UserSearch = {}): Promise<User[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const q = clean(search.q);
  if (q) {
    params.push(`%${escapeLike(q.toLowerCase())}%`);
    where.push(`(lower(full_name) like $${params.length} escape '\\' or lower(username) like $${params.length} escape '\\')`);
  }
  if (isOneOf(ROLES, search.role)) {
    params.push(search.role);
    where.push(`role = $${params.length}`);
  }
  if (isOneOf(ACCOUNT_STATUSES, search.status)) {
    params.push(search.status);
    where.push(`status = $${params.length}`);
  }
  const clause = where.length ? `where ${where.join(" and ")}` : "";
  return db.query<User>(`select ${USER_COLS} from user_accounts ${clause} order by lower(full_name), id`, params);
}

/** User directory for Interior Designers: only active accounts. */
export function userDirectory(db: Db, role?: string | null): Promise<User[]> {
  return searchUsers(db, { role, status: "ACTIVE" });
}

export async function countUsersByRole(db: Db): Promise<Record<Role, number>> {
  const rows = await db.query<{ role: Role; count: number }>(`select role, count(*)::int as count from user_accounts group by role`);
  const counts = Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<Role, number>;
  for (const row of rows) counts[row.role] = row.count;
  return counts;
}

// ------------------------------------------------------------------ profiles

const PROFILE_DESCRIPTIONS: Record<Role, string> = {
  USER_ADMIN: "Creates, updates, disables and searches user accounts; responds to reported issues.",
  INTERIOR_DESIGNER: "Manages company information, a portfolio of current and past projects, and availability.",
  CUSTOMER: "Searches, views, rates and saves interior design projects; checks designers' calendars.",
  PLATFORM_MANAGEMENT: "Manages project categories, ratings and banned users; views daily, weekly and monthly reports.",
};

const PROFILE_COLS = `id, role, name, description, active, updated_at as "updatedAt"`;

/** Makes sure one profile exists per role. Safe to run many times. */
export async function ensureProfiles(db: Db): Promise<void> {
  for (const role of ROLES) {
    await db.query(
      `insert into user_profiles (role, name, description) values ($1, $2, $3) on conflict (role) do nothing`,
      [role, ROLE_LABELS[role], PROFILE_DESCRIPTIONS[role]],
    );
  }
}

export function listProfiles(db: Db): Promise<UserProfile[]> {
  return db.query<UserProfile>(`select ${PROFILE_COLS} from user_profiles order by id`);
}

export async function isProfileActive(db: Db, role: Role): Promise<boolean> {
  const row = await one<{ active: boolean }>(db, `select active from user_profiles where role = $1`, [role]);
  return row ? row.active : true;
}

export async function updateProfile(db: Db, id: number, name: string, description: string | null, active: boolean): Promise<UserProfile> {
  const profile = await one<UserProfile>(db, `select ${PROFILE_COLS} from user_profiles where id = $1::int`, [id]);
  if (!profile) throw new NotFoundError("Profile not found");
  const cleanName = clean(name);
  if (!cleanName) throw new BusinessError("Profile name is required.");
  if (profile.role === "USER_ADMIN" && !active) {
    throw new BusinessError("The User Admin profile cannot be suspended, otherwise nobody could manage accounts.");
  }
  const updated = await one<UserProfile>(
    db,
    `update user_profiles set name = $2, description = $3, active = $4::boolean, updated_at = now() where id = $1::int returning ${PROFILE_COLS}`,
    [id, cleanName, clean(description), active],
  );
  if (profile.active && !active) await destroyRoleSessions(db, profile.role);
  return updated!;
}
