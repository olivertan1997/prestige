// Adds the extra sample data (src/services/sample-data.ts) to the Supabase database, once.
// Everything happens in one transaction: if any target is missed, nothing is saved.
// Run by the "Add sample data" GitHub Actions workflow (Actions tab -> Add sample data -> Run workflow).
//   Needs: DB_HOST, DB_USER, DB_PASSWORD   Optional: DB_PORT (5432), DB_NAME (postgres)
import postgres from "postgres";
import { postgresDb } from "../src/db";
import { SAMPLE_EMAIL_DOMAIN, SAMPLE_PASSWORD, addSampleData, sampleDataProblems } from "../src/services/sample-data";

const { DB_HOST, DB_USER, DB_PASSWORD, DB_PORT = "5432", DB_NAME = "postgres" } = process.env;
if (!DB_HOST || !DB_USER || !DB_PASSWORD) {
  console.error("Set DB_HOST, DB_USER and DB_PASSWORD (Supabase session pooler details).");
  process.exit(1);
}

const sql = postgres({
  host: DB_HOST, port: Number(DB_PORT), database: DB_NAME, username: DB_USER, password: DB_PASSWORD,
  ssl: "require", max: 1, connect_timeout: 30, onnotice: () => undefined,
});

class Problems extends Error {}

try {
  console.log(`Connecting to ${DB_HOST}:${DB_PORT} as ${DB_USER} ...`);
  const result = await sql.begin(async (tx) => {
    const res = await addSampleData(postgresDb(tx as unknown as postgres.Sql));
    if (!res) return null;
    const problems = sampleDataProblems(res);
    if (problems.length) throw new Problems(`Targets missed, nothing was saved: ${problems.join("; ")}`);
    return res;
  });
  if (!result) {
    console.log(`Sample data is already in the database (accounts ending @${SAMPLE_EMAIL_DOMAIN}) - nothing added.`);
  } else {
    const { added: a, checks: c } = result;
    console.log("Sample data added:");
    console.log(`  user_accounts       +${a.designers + a.customers} (${a.designers} Interior Designers, ${a.customers} Customers; password ${SAMPLE_PASSWORD})`);
    console.log(`  companies           +${a.companies}`);
    console.log(`  categories          +${a.categories}`);
    console.log(`  design_projects     +${a.projects} (${a.currentProjects} current)`);
    console.log(`  ratings             +${a.ratings} ("${c.featuredProject.title}": ${c.featuredProject.ratings} ratings, lowest ${c.featuredProject.lowestScore}; others at most ${c.mostRatingsOnAnyOtherProject}, lowest ${c.lowestScoreOnOtherProjects})`);
    console.log(`  favourites          +${a.favourites} (${c.projectsShortlistedOver23In30Days} projects shortlisted more than 23 times in the last 30 days)`);
    console.log(`  project_activities  +${a.activities} (${a.views} views, ${a.shortlists} shortlists; ${c.projectsWith12To70Views} projects with 12-70 views)`);
    console.log(`  availability_slots  +${c.slots.total} in November 2026 (${c.slots.booked} booked, ${c.slots.available} available)`);
    console.log(`  issue_reports       +${c.issues.total} from 13 Oct to 12 Nov 2026 (${c.issues.pending} pending, ${c.issues.reviewed} reviewed, ${c.issues.rectified} rectified)`);
  }
} catch (error) {
  console.error(error instanceof Problems ? error.message : `Adding sample data failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
