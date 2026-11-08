import postgres from "postgres";

/**
 * Minimal database interface used by every service. Production uses postgres.js through
 * Cloudflare Hyperdrive; the tests use an in-memory PostgreSQL (PGlite) with the same SQL.
 * Parameters are always passed separately ($1, $2, ...) - never concatenated into SQL.
 */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Runs a script with several statements and no parameters (used for the schema). */
  exec(sqlText: string): Promise<void>;
}

export interface DbHandle {
  db: Db;
  close?: () => Promise<void>;
}

export function postgresDb(sql: postgres.Sql): Db {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const rows = await sql.unsafe(text, params as postgres.ParameterOrJSON<never>[], { prepare: true });
      return rows as unknown as T[];
    },
    async exec(text: string) {
      await sql.unsafe(text);
    },
  };
}

/** Opens a short-lived client. With Hyperdrive, creating one per request is fast and recommended. */
export function openPostgres(connectionString: string, options: postgres.Options<Record<string, never>> = {}): DbHandle {
  const sql = postgres(connectionString, { max: 5, fetch_types: false, prepare: true, ...options });
  return { db: postgresDb(sql), close: () => sql.end({ timeout: 5 }) };
}

export async function one<T>(db: Db, text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await db.query<T>(text, params);
  return rows[0] ?? null;
}
