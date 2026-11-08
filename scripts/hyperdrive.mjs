// Creates or updates the Cloudflare Hyperdrive configuration that connects the Worker to Supabase,
// with query caching DISABLED (so pages always show fresh data), then writes its id into wrangler.jsonc.
// Tries Supabase's direct connection first (recommended by Cloudflare), then the IPv4 session pooler.
//   Needs: CLOUDFLARE_API_TOKEN (with Hyperdrive Edit), CLOUDFLARE_ACCOUNT_ID, DB_HOST, DB_USER, DB_PASSWORD
import { readFileSync, writeFileSync } from "node:fs";

const env = process.env;
const NAME = "prestige-supabase";
const required = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "DB_HOST", "DB_USER", "DB_PASSWORD"];
const missing = required.filter((k) => !env[k]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const token = env.CLOUDFLARE_API_TOKEN.trim();
const root = "https://api.cloudflare.com/client/v4";
const base = `${root}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/hyperdrive/configs`;
async function api(method, path = "", body, url = base + path) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  const errors = (json.errors ?? []).map((e) => `${e.code}: ${e.message}`).join("; ") || `HTTP ${res.status}`;
  return { ok: res.ok && json.success !== false, status: res.status, json, errors };
}

/** Explains an authentication failure without ever printing the token itself. */
async function explainAuthFailure() {
  const userToken = await api("GET", "", undefined, `${root}/user/tokens/verify`);
  const accountToken = await api("GET", "", undefined, `${root}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/tokens/verify`);
  const workers = await api("GET", "", undefined, `${root}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts`);
  const valid = (userToken.ok && userToken.json.result?.status === "active") || (accountToken.ok && accountToken.json.result?.status === "active");
  console.error("--- Cloudflare API token check ---");
  console.error(`Token length: ${token.length} characters${token !== env.CLOUDFLARE_API_TOKEN ? " (extra spaces/new lines were removed)" : ""}`);
  console.error(`Token is valid and active: ${valid ? "yes" : "NO"}`);
  console.error(`Token can access Workers on account ${env.CLOUDFLARE_ACCOUNT_ID}: ${workers.ok ? "yes" : "NO"}`);
  if (!valid) {
    console.error("=> The CLOUDFLARE_API_TOKEN secret is not a valid token. Copy the token value again (not the token name or ID) and update the GitHub secret.");
  } else if (!workers.ok) {
    console.error("=> The token works, but not for this Cloudflare account. Check CLOUDFLARE_ACCOUNT_ID and the token's 'Account Resources'.");
  } else {
    console.error("=> The token works for Workers but is missing Hyperdrive. Edit the token and add: Account -> Hyperdrive -> Edit.");
  }
}

const list = await api("GET", "?per_page=100");
if (!list.ok) {
  console.error(`Could not list Hyperdrive configurations (${list.errors}).`);
  if (list.status === 400 || list.status === 401 || list.status === 403) await explainAuthFailure();
  process.exit(1);
}
let existing = (list.json.result ?? []).find((c) => c.name === NAME);

const ref = env.DB_USER.startsWith("postgres.") ? env.DB_USER.slice("postgres.".length) : null;
const origins = [];
if (env.DB_DIRECT_HOST || ref) {
  origins.push({ label: "Supabase direct connection", host: env.DB_DIRECT_HOST || `db.${ref}.supabase.co`, port: 5432, user: "postgres" });
}
origins.push({ label: "Supabase session pooler", host: env.DB_HOST, port: Number(env.DB_PORT || 5432), user: env.DB_USER });

let id = null;
for (const origin of origins) {
  const body = {
    name: NAME,
    origin: { scheme: "postgres", host: origin.host, port: origin.port, database: env.DB_NAME || "postgres", user: origin.user, password: env.DB_PASSWORD },
    caching: { disabled: true },
  };
  const res = existing ? await api("PUT", `/${existing.id}`, body) : await api("POST", "", body);
  if (res.ok) {
    id = res.json.result.id;
    console.log(`Hyperdrive '${NAME}' (${id}) now connects to the ${origin.label} (${origin.host}), caching disabled.`);
    break;
  }
  console.warn(`Could not use the ${origin.label} (${origin.host}): ${res.errors}`);
  if (res.status === 401 || res.status === 403) {
    await explainAuthFailure();
    process.exit(1);
  }
}
if (!id) {
  console.error("Hyperdrive could not connect to Supabase with any connection option. Check DB_HOST, DB_USER and DB_PASSWORD.");
  process.exit(1);
}

const config = readFileSync("wrangler.jsonc", "utf8");
const updated = config.replace(/("binding":\s*"HYPERDRIVE",\s*"id":\s*")[0-9a-f]{32}(")/, `$1${id}$2`);
if (updated === config && !config.includes(id)) {
  console.error("Could not find the HYPERDRIVE binding id in wrangler.jsonc.");
  process.exit(1);
}
writeFileSync("wrangler.jsonc", updated);
console.log("wrangler.jsonc updated with the Hyperdrive id.");
