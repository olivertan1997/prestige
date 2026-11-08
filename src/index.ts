// Cloudflare Worker entry point for Prestige Interior Design.
import { createApp } from "./app";
import { openPostgres } from "./db";

const app = createApp({
  openDb: (env) => {
    if (!env.HYPERDRIVE) throw new Error("The HYPERDRIVE binding is not configured");
    return openPostgres(env.HYPERDRIVE.connectionString);
  },
});

export default app;
