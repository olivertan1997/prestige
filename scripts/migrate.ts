// Creates / upgrades the Supabase tables and (once) the demo data. Run by GitHub Actions before each deploy.
// Connects through Supabase's session pooler (IPv4), because GitHub's runners cannot reach IPv6-only hosts.
//   Needs: DB_HOST, DB_USER, DB_PASSWORD   Optional: DB_PORT (5432), DB_NAME (postgres), APP_SEED_PASSWORD
import postgres from "postgres";
import { postgresDb } from "../src/db";
import { SCHEMA_SQL } from "../src/schema";
import { ensureDefaultCategories } from "../src/services/catalog";
import { seedDemoData } from "../src/services/demo";

const { DB_HOST, DB_USER, DB_PASSWORD, DB_PORT = "5432", DB_NAME = "postgres", APP_SEED_PASSWORD } = process.env;
if (!DB_HOST || !DB_USER || !DB_PASSWORD) {
  console.error("Set DB_HOST, DB_USER and DB_PASSWORD (Supabase session pooler details).");
  process.exit(1);
}

const sql = postgres({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_NAME,
  username: DB_USER,
  password: DB_PASSWORD,
  ssl: "require",
  max: 1,
  connect_timeout: 30,
  onnotice: () => undefined,
});
const db = postgresDb(sql);

try {
  console.log(`Connecting to ${DB_HOST}:${DB_PORT} as ${DB_USER} ...`);
  await db.exec(SCHEMA_SQL);
  console.log("Tables are up to date.");
  await ensureDefaultCategories(db);
  console.log("Default categories are in place.");
  if (APP_SEED_PASSWORD && APP_SEED_PASSWORD.length >= 8) {
    const seeded = await seedDemoData(db, APP_SEED_PASSWORD);
    console.log(seeded ? "Demo accounts and sample projects created." : "Demo data already exists - left unchanged.");
  } else {
    console.log("APP_SEED_PASSWORD not set (or shorter than 8 characters) - demo accounts were not created.");
  }
} catch (error) {
  console.error("Database setup failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
