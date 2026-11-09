// Prestige Interior Design - UAT helper.
//
//   npm run uat:plan                       Rebuild uat/test-plan.md and uat/test-cases.csv from the checklist.
//   npm run uat:save -- <results.csv>      Save a finished UAT round as a new version: uat/runs/v1, v2, ...
//        options: --version v3   (only needed if the CSV has no Round column)
//                 --force        (overwrite a version that was already saved)
//
// The CSV is the file from "Download results (CSV)" on the UAT checklist page.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const UAT = join(ROOT, "uat");
const SITE_URL = "https://prestige-interior.olivertan1997.workers.dev";

// ------------------------------------------------------------------ helpers

// Each UAT round can have its own edition of the checklist: uat/prestige-uat-v2.html, -v3.html, ...
// Round N uses the newest edition numbered N or lower (round v1 uses the oldest edition there is).
function checklistFile(round = Infinity) {
  const editions = readdirSync(UAT)
    .map((f) => /^prestige-uat-v(\d+)\.html$/.exec(f))
    .filter(Boolean)
    .sort((a, b) => Number(a[1]) - Number(b[1]));
  if (!editions.length) throw new Error("No checklist found: expected uat/prestige-uat-v2.html (or a later edition)");
  return (editions.filter((m) => Number(m[1]) <= round).at(-1) ?? editions[0])[0];
}

function loadPlan(round) {
  const file = checklistFile(round);
  const html = readFileSync(join(UAT, file), "utf8");
  const start = html.indexOf("var MODULES");
  const end = html.indexOf("var CASE_IDS");
  if (start < 0 || end < 0) throw new Error(`Could not find the test plan inside uat/${file}`);
  // The plan is plain data (arrays of strings) defined in our own checklist page.
  const edition = Number(/-v(\d+)\.html$/.exec(file)?.[1] ?? 1);
  return { ...new Function(`${html.slice(start, end)}; return { MODULES, REQS, CASES };`)(), file, edition };
}

const reqLabel = (r) => (r === "Other 1" ? "Other requirement 1" : r);

function csvCell(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

const md = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

// --------------------------------------------------------------------- plan

function writePlan() {
  const { MODULES, REQS, CASES, file, edition } = loadPlan();
  const uat = edition > 1 ? `uat${edition}` : "uat"; // later rounds use fresh test accounts: uat2.customer, ...
  const out = [];
  out.push("# Prestige Interior Design - UAT test plan", "");
  out.push(`- **Website under test:** ${SITE_URL}`);
  out.push(`- **Checklist page:** \`uat/${file}\` (open it in a web browser; it records results per round)`);
  out.push(`- **Test cases:** ${CASES.length}, covering the 6 project specifications and 12 user stories`, "");
  out.push(`> Generated from \`uat/${file}\` by \`npm run uat:plan\`. Edit the checklist, then regenerate this file.`, "");
  out.push("## Test accounts", "");
  out.push("| Username | Name | Role |", "| --- | --- | --- |");
  [
    ["admin", "Aaron Lim", "User Admin"], ["platform", "Priya Nair", "Platform Management"],
    ["sophia", "Sophia Tan (Atelier Tan Interiors)", "Interior Designer"], ["marcus", "Marcus Lee (Lee & Lumen Design Studio)", "Interior Designer"],
    ["emily", "Emily Chen", "Customer"], ["daniel", "Daniel Ng", "Customer"],
    [`${uat}.customer`, "Created in A-01", "Customer"], [`${uat}.designer`, "Created in A-02", "Interior Designer"],
  ].forEach(([u, n, r]) => out.push(`| \`${u}\` | ${n} | ${r} |`));
  out.push("", "The demo accounts use the demo password saved as `APP_SEED_PASSWORD` in GitHub. Run the modules in order (A to F).", "");
  if (edition > 1) {
    out.push(`This is the round v${edition} edition. The test accounts and projects from earlier rounds still exist on the website, so this round uses fresh names starting \`${uat}\` / “${uat.toUpperCase()}”.`, "");
  }

  for (const m of MODULES) {
    out.push(`## Module ${m.key} - ${m.name}`, "", m.intro, "");
    for (const c of CASES.filter((x) => x.mod === m.key)) {
      out.push(`### ${c.id} - ${c.title}`, "");
      out.push(`**Requirement:** ${c.req.length ? c.req.map(reqLabel).join(", ") : "General"} · **Account:** ${c.who}${c.needs ? ` · **Needs:** ${c.needs}` : ""}`, "");
      out.push("**Steps**", "");
      c.steps.forEach((s, i) => out.push(`${i + 1}. ${s}`));
      out.push("", "**Expected result**", "");
      c.expect.forEach((s) => out.push(`- ${s}`));
      out.push("", "**Result:** ☐ Pass ☐ Fail ☐ Blocked   **Notes:** ______________________", "");
    }
  }

  out.push("## Requirement traceability", "", "| Requirement | What it covers | Test cases |", "| --- | --- | --- |");
  for (const [key, text] of REQS) {
    const ids = CASES.filter((c) => c.req.includes(key)).map((c) => c.id);
    out.push(`| ${reqLabel(key)} | ${text} | ${ids.join(", ")} |`);
  }
  out.push("");
  writeFileSync(join(UAT, "test-plan.md"), out.join("\n"));

  const rows = [["ID", "Module", "Requirements", "Title", "Account", "Needs", "Steps", "Expected result"]];
  const strip = (s) => s.replace(/\*\*/g, "").replace(/`/g, "");
  for (const c of CASES) {
    const mod = MODULES.find((m) => m.key === c.mod);
    rows.push([c.id, mod.name, c.req.map(reqLabel).join("; ") || "General", c.title, c.who, c.needs ?? "",
      c.steps.map((s, i) => `${i + 1}. ${strip(s)}`).join("\n"), c.expect.map((s) => `- ${strip(s)}`).join("\n")]);
  }
  writeFileSync(join(UAT, "test-cases.csv"), rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n");
  console.log(`Wrote uat/test-plan.md and uat/test-cases.csv (${CASES.length} test cases).`);
}

// --------------------------------------------------------------------- save

function existingRuns(runsDir) {
  if (!existsSync(runsDir)) return [];
  return readdirSync(runsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^v\d+$/.test(d.name))
    .map((d) => {
      const file = join(runsDir, d.name, "run.json");
      return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.n - b.n);
}

function writeRunsIndex(runsDir) {
  const runs = existingRuns(runsDir);
  const out = ["# UAT rounds", "", "Each folder is one UAT run, saved with `npm run uat:save -- <results.csv>`. Saved versions are never overwritten.", ""];
  if (!runs.length) out.push("No rounds saved yet.");
  else {
    out.push("| Version | Tested | Passed | Failed | Blocked | Not run | Pass rate (of tests run) | Summary |", "| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const r of runs) {
      const run = r.counts.pass + r.counts.fail + r.counts.blocked;
      const rate = run ? `${Math.round((r.counts.pass / run) * 100)}%` : "-";
      out.push(`| **${r.version}** | ${r.testedFrom ?? "-"} to ${r.testedTo ?? "-"} | ${r.counts.pass} | ${r.counts.fail} | ${r.counts.blocked} | ${r.counts.untested} | ${rate} | [${r.version}/summary.md](${r.version}/summary.md) |`);
    }
  }
  out.push("");
  writeFileSync(join(runsDir, "README.md"), out.join("\n"));
}

function saveRun(args) {
  const csvPath = args.find((a) => !a.startsWith("--"));
  if (!csvPath) fail("Give the results file, e.g.  npm run uat:save -- \"C:\\Users\\you\\Downloads\\prestige-uat-v1-results-2026-11-07.csv\"");
  if (!existsSync(csvPath)) fail(`File not found: ${csvPath}`);
  const force = args.includes("--force");
  const vIdx = args.indexOf("--version");
  const runsDir = join(UAT, "runs");

  const rows = parseCsv(readFileSync(csvPath, "utf8").replace(/^\uFEFF/, ""));
  const header = rows.shift() ?? [];
  const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const iRound = col("Round"), iId = col("ID"), iResult = col("Result");
  if (iId < 0 || iResult < 0) fail("This doesn't look like a results file from the UAT checklist (no ID / Result columns).");

  let version = vIdx >= 0 ? args[vIdx + 1] : rows.find((r) => r[iRound])?.[iRound];
  if (!version) {
    const n = (existingRuns(runsDir).at(-1)?.n ?? 0) + 1;
    version = `v${n}`;
  }
  if (!/^v\d+$/.test(version)) fail(`The version must look like v1, v2, ... (got "${version}").`);
  const n = Number(version.slice(1));
  const dir = join(runsDir, version);
  if (existsSync(dir) && !force) fail(`Version ${version} is already saved in uat/runs/${version}. Start a new round in the checklist, or add --force to replace it.`);

  const { REQS, CASES, file } = loadPlan(n);
  const get = (r, name) => { const i = col(name); return i >= 0 ? (r[i] ?? "") : ""; };
  const results = rows.map((r) => ({
    id: r[iId], title: get(r, "Test"), module: get(r, "Module"), reqs: get(r, "Requirements"), result: r[iResult] || "Not run",
    notes: get(r, "Notes"), by: get(r, "Tested by"), at: get(r, "Tested at"),
  }));
  const key = { Pass: "pass", Fail: "fail", Blocked: "blocked" };
  const counts = { pass: 0, fail: 0, blocked: 0, untested: 0 };
  for (const r of results) counts[key[r.result] ?? "untested"]++;
  const stamps = results.map((r) => r.at).filter(Boolean).sort();
  const day = (iso) => (iso ? iso.slice(0, 10) : null);
  const testedFrom = day(stamps[0]), testedTo = day(stamps.at(-1));

  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "results.csv"), readFileSync(csvPath));

  const byId = new Map(results.map((r) => [r.id, r]));
  const out = [`# UAT round ${version}`, ""];
  out.push(`- **Tested:** ${testedFrom ?? "-"}${testedTo && testedTo !== testedFrom ? ` to ${testedTo}` : ""}`);
  out.push(`- **Saved:** ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC from \`${basename(csvPath)}\``);
  out.push(`- **Website:** ${SITE_URL}`);
  out.push(`- **Checklist:** \`uat/${file}\``, "");
  const run = counts.pass + counts.fail + counts.blocked;
  out.push("| Result | Tests |", "| --- | --- |");
  out.push(`| Pass | ${counts.pass} |`, `| Fail | ${counts.fail} |`, `| Blocked | ${counts.blocked} |`, `| Not run | ${counts.untested} |`, `| **Total** | **${results.length}** |`, "");
  out.push(`**Pass rate:** ${run ? Math.round((counts.pass / run) * 100) : 0}% of the ${run} tests run.`, "");

  const section = (title, list) => {
    out.push(`## ${title} (${list.length})`, "");
    if (!list.length) { out.push("None.", ""); return; }
    out.push("| ID | Test | Notes | Tested by | Tested at |", "| --- | --- | --- | --- | --- |");
    for (const r of list) out.push(`| ${r.id} | ${md(r.title)} | ${md(r.notes) || "-"} | ${md(r.by) || "-"} | ${r.at ? r.at.slice(0, 16).replace("T", " ") : "-"} |`);
    out.push("");
  };
  section("Failed", results.filter((r) => r.result === "Fail"));
  section("Blocked", results.filter((r) => r.result === "Blocked"));
  const notRun = results.filter((r) => !key[r.result]);
  out.push(`## Not run (${notRun.length})`, "", notRun.length ? notRun.map((r) => r.id).join(", ") : "None.", "");

  out.push("## Requirement coverage", "", "| Requirement | What it covers | Tests | Status |", "| --- | --- | --- | --- |");
  for (const [k, text] of REQS) {
    const ids = CASES.filter((c) => c.req.includes(k)).map((c) => c.id);
    const sts = ids.map((id) => byId.get(id)?.result ?? "Not run");
    const status = sts.includes("Fail") ? "Failing" : sts.length && sts.every((s) => s === "Pass") ? "Passed" : sts.some((s) => key[s]) ? "In progress" : "Not run";
    out.push(`| ${reqLabel(k)} | ${text} | ${ids.map((id) => `${id} (${byId.get(id)?.result ?? "Not run"})`).join(", ")} | ${status} |`);
  }
  out.push("", "## All results", "", "| ID | Module | Test | Result | Notes |", "| --- | --- | --- | --- | --- |");
  for (const r of results) out.push(`| ${r.id} | ${md(r.module)} | ${md(r.title)} | ${r.result} | ${md(r.notes) || "-"} |`);
  out.push("");
  writeFileSync(join(dir, "summary.md"), out.join("\n"));
  writeFileSync(join(dir, "run.json"), JSON.stringify({ version, n, testedFrom, testedTo, savedAt: new Date().toISOString(), source: basename(csvPath), counts, total: results.length }, null, 2) + "\n");
  writeRunsIndex(runsDir);
  console.log(`Saved UAT round ${version} to uat/runs/${version}/ (${counts.pass} passed, ${counts.fail} failed, ${counts.blocked} blocked, ${counts.untested} not run).`);
}

// --------------------------------------------------------------------- main

const [command, ...rest] = process.argv.slice(2);
if (command === "plan") writePlan();
else if (command === "save") saveRun(rest);
else if (command === "index") writeRunsIndex(join(UAT, "runs"));
else fail("Usage:\n  npm run uat:plan\n  npm run uat:save -- <results.csv> [--version vN] [--force]");
