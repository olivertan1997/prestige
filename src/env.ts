import type { Db } from "./db";
import type { SessionUser } from "./types";

export interface Bindings {
  /** Cloudflare Hyperdrive connection to Supabase PostgreSQL. */
  HYPERDRIVE?: Hyperdrive;
}

export interface Flash {
  success?: string;
  error?: string;
}

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    db: Db;
    user: SessionUser | null;
    sessionExpired: boolean;
    flash: Flash | null;
  };
};
