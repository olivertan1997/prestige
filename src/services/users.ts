// User accounts: creating accounts, looking them up and logging in.
import { one, type Db } from "../db";
import { BusinessError, NotFoundError, clean } from "../lib/errors";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  ROLES,
  isOneOf,
  type Role,
  type User,
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

// ------------------------------------------------------------------------ create

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

// ------------------------------------------------------------------------ login

export type LoginResult = { ok: true; user: User } | { ok: false; reason: "error" };

export async function authenticate(db: Db, username: string, password: string): Promise<LoginResult> {
  const user = username ? await findUserByUsername(db, username) : null;
  if (!user) {
    await hashPassword(password || "x"); // similar timing whether or not the user exists
    return { ok: false, reason: "error" };
  }
  if (!(await verifyPassword(password, user.passwordHash))) return { ok: false, reason: "error" };
  await db.query(`update user_accounts set last_login_at = now() where id = $1::int`, [user.id]);
  return { ok: true, user };
}
