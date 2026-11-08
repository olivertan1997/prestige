import { one, type Db } from "../db";
import type { Role, SessionUser } from "../types";
import { randomHex, sha256Hex, utf8 } from "./password";

export const SESSION_COOKIE = "pid_session";
export const SESSION_DAYS = 7;

/**
 * Sessions are stored in the database so that disabling or banning a user signs them out
 * immediately. The browser only holds a random token; the database stores its SHA-256.
 */
export async function createSession(db: Db, userId: number): Promise<string> {
  const token = randomHex(32);
  const id = await sha256Hex(utf8(token));
  await db.query(
    `insert into sessions (id, user_id, expires_at) values ($1, $2::int, now() + $3::int * interval '1 day')`,
    [id, userId, SESSION_DAYS],
  );
  return token;
}

/** Returns the user for a session token, or null if it is unknown, expired, or the account is not usable. */
export async function loadSessionUser(db: Db, token: string | undefined): Promise<SessionUser | null> {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const id = await sha256Hex(utf8(token));
  return one<SessionUser>(
    db,
    `select u.id, u.username, u.full_name as "fullName", u.role, u.email
       from sessions s
       join user_accounts u on u.id = s.user_id
      where s.id = $1 and s.expires_at > now() and u.status = 'ACTIVE'`,
    [id],
  );
}

export async function destroySession(db: Db, token: string | undefined): Promise<void> {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return;
  await db.query(`delete from sessions where id = $1`, [await sha256Hex(utf8(token))]);
}

export async function destroyUserSessions(db: Db, userId: number): Promise<number> {
  const rows = await db.query(`delete from sessions where user_id = $1::int returning id`, [userId]);
  return rows.length;
}

export async function destroyRoleSessions(db: Db, role: Role): Promise<void> {
  await db.query(`delete from sessions where user_id in (select id from user_accounts where role = $1)`, [role]);
}
