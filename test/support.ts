// Shared test set-up: an in-memory PostgreSQL (PGlite) with the real schema, the real app,
// and a tiny "browser" that keeps cookies between requests. Each test runs in a transaction
// that is rolled back afterwards, so tests never see each other's data.
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { createApp } from "../src/app";
import type { Db } from "../src/db";
import { SESSION_COOKIE, createSession } from "../src/lib/sessions";
import { SCHEMA_SQL } from "../src/schema";
import { createCategory } from "../src/services/catalog";
import { getProject } from "../src/services/projects";
import { createUser, ensureProfiles } from "../src/services/users";
import type { Category, Project, ProjectStatus, Role, User } from "../src/types";

export const PASSWORD = "Password123!";
let seq = 0;
export const next = () => ++seq;

export interface TestEnv {
  pg: PGlite;
  db: Db;
  app: ReturnType<typeof createApp>;
}

export function useTestDb(): TestEnv {
  const env = {} as TestEnv;
  beforeAll(async () => {
    env.pg = await PGlite.create();
    await env.pg.exec(SCHEMA_SQL);
    env.db = {
      query: async <T>(text: string, params: unknown[] = []) => (await env.pg.query(text, params as never[])).rows as T[],
      exec: async (text: string) => {
        await env.pg.exec(text);
      },
    };
    await ensureProfiles(env.db);
    env.app = createApp({ openDb: () => ({ db: env.db }) });
  });
  beforeEach(async () => {
    await env.pg.exec("BEGIN");
  });
  afterEach(async () => {
    await env.pg.exec("ROLLBACK");
  });
  afterAll(async () => {
    await env.pg.close();
  });
  return env;
}

/** Sends requests to the app like a browser, keeping cookies between requests. */
export class Browser {
  readonly cookies = new Map<string, string>();

  constructor(private readonly env: TestEnv) {}

  private cookieHeader(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private remember(res: Response): Response {
    for (const header of res.headers.getSetCookie()) {
      const [pair, ...attrs] = header.split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      const expired = value === "" || attrs.some((a) => /^\s*max-age=0\s*$/i.test(a));
      if (expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    return res;
  }

  async get(path: string, headers: Record<string, string> = {}): Promise<Response> {
    return this.remember(await this.env.app.request(path, { headers: { cookie: this.cookieHeader(), ...headers } }));
  }

  async post(path: string, form: Record<string, string> = {}, headers: Record<string, string> = {}): Promise<Response> {
    return this.remember(
      await this.env.app.request(path, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", origin: "http://localhost", cookie: this.cookieHeader(), ...headers },
        body: new URLSearchParams(form).toString(),
      }),
    );
  }

  /** Logs in by creating a session directly (fast). */
  async loginAs(user: User): Promise<this> {
    this.cookies.set(SESSION_COOKIE, await createSession(this.env.db, user.id));
    return this;
  }

  /** Logs in through the real login form. */
  loginWithPassword(username: string, password = PASSWORD): Promise<Response> {
    return this.post("/login", { username, password });
  }
}

export const browser = (env: TestEnv) => new Browser(env);
export const asUser = (env: TestEnv, user: User) => new Browser(env).loginAs(user);

export async function newUser(env: TestEnv, role: Role, fullName?: string): Promise<User> {
  const n = next();
  const username = `${role.toLowerCase().replace(/_/g, ".")}${n}`;
  return createUser(env.db, {
    username,
    email: `${username}@test.example.com`,
    fullName: fullName ?? `Test ${role} ${n}`,
    password: PASSWORD,
    role,
  });
}

export async function newCategory(env: TestEnv, name = "Category"): Promise<Category> {
  return createCategory(env.db, `${name} ${next()}`);
}

export async function newProject(
  env: TestEnv,
  designer: User,
  title: string,
  opts: { category?: Category; description?: string; status?: ProjectStatus } = {},
): Promise<Project> {
  const category = opts.category ?? (await newCategory(env));
  // Until designers can manage a portfolio, test projects are inserted straight into the table.
  const [row] = await env.db.query<{ id: number }>(
    `insert into design_projects (designer_id, category_id, title, description, status, style, location)
     values ($1::int, $2::int, $3, $4, $5, 'Modern', 'Singapore') returning id`,
    [designer.id, category.id, title, opts.description ?? "A test project", opts.status ?? "CURRENT"],
  );
  return (await getProject(env.db, row.id))!;
}

export const location = (res: Response) => res.headers.get("location");

/** All numeric values of a data-* attribute in an HTML page, e.g. ids(html, "data-user"). */
export function ids(html: string, attr: string): number[] {
  return [...html.matchAll(new RegExp(`${attr}="(\\d+)"`, "g"))].map((m) => Number(m[1]));
}
