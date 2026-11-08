// Prestige Interior Design - runs ALL automated test cases and prints one line per feature:
//   6 project specifications + 12 user stories + SHA-256 password hashing + a smoke test of every page.
// Example output line:   Feature 5:               Good  Rating system ... (5/5 test cases passed)
// Usage: npm test
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, basename } from "node:path";

const RESULTS = "test-results/results.json";
const SUMMARY = "test-results/summary.txt";
const KEY = /^(Spec|Feature|Other Requirement|Smoke Test)\s+(\d+)\s*:\s*(.*)$/;
const ORDER = { Spec: 0, Feature: 1, "Other Requirement": 2, "Smoke Test": 3 };
const LINE = "=".repeat(78);

rmSync(RESULTS, { force: true });
const require = createRequire(import.meta.url);
const pkgPath = require.resolve("vitest/package.json");
const bin = JSON.parse(readFileSync(pkgPath, "utf8")).bin;
const vitestBin = join(dirname(pkgPath), typeof bin === "string" ? bin : bin.vitest);

console.log("Running Prestige Interior Design test suite...\n");
const run = spawnSync(process.execPath, [vitestBin, "run"], { stdio: "inherit" });

if (!existsSync(RESULTS)) {
  console.error("\nNo test results were produced - the test run failed to start (see the errors above).");
  process.exit(run.status || 1);
}

const data = JSON.parse(readFileSync(RESULTS, "utf8"));
const groups = new Map();
const group = (name) => {
  if (!groups.has(name)) groups.set(name, { name, passed: 0, failures: [] });
  return groups.get(name);
};
const shorten = (msg) => {
  const text = String(msg ?? "").replace(/\u001b\[[0-9;]*m/g, "").split("\n")[0].replace(/\s+/g, " ").trim();
  return text.length > 200 ? text.slice(0, 200) + "..." : text;
};

for (const file of data.testResults ?? []) {
  const results = file.assertionResults ?? [];
  if (!results.length && file.status === "failed") {
    group(`File ${basename(file.name)}`).failures.push(`(could not run) ${shorten(file.message)}`);
  }
  for (const t of results) {
    const g = group(t.ancestorTitles?.[0] ?? `File ${basename(file.name)}`);
    if (t.status === "passed") g.passed++;
    else if (t.status === "failed") g.failures.push(`${t.title} -> ${shorten(t.failureMessages?.[0])}`);
  }
}

const parse = (name) => {
  const m = KEY.exec(name);
  return m ? { key: `${m[1]} ${m[2]}`, title: m[3], order: ORDER[m[1]], num: Number(m[2]) } : { key: name, title: "", order: 9, num: 0 };
};
const sorted = [...groups.values()].sort((a, b) => {
  const pa = parse(a.name), pb = parse(b.name);
  return pa.order - pb.order || pa.num - pb.num || a.name.localeCompare(b.name);
});

let good = 0, total = 0, passed = 0;
const lines = [LINE, "  PRESTIGE INTERIOR DESIGN - TEST RESULTS (6 project specifications + 12 user stories)", LINE];
for (const g of sorted) {
  const { key, title } = parse(g.name);
  const count = g.passed + g.failures.length;
  const isGood = g.failures.length === 0 && g.passed > 0;
  if (isGood) good++;
  total += count;
  passed += g.passed;
  lines.push(`  ${(key + ":").padEnd(24)} ${(isGood ? "Good" : "Bad").padEnd(5)} ${title} (${g.passed}/${count} test cases passed)`);
  for (const f of g.failures) lines.push(`        x ${f}`);
}
lines.push("-".repeat(78), `  OVERALL: ${good}/${sorted.length} features Good | ${passed}/${total} test cases passed`, LINE);

const summary = lines.join("\n") + "\n";
mkdirSync("test-results", { recursive: true });
writeFileSync(SUMMARY, summary);
console.log("\n" + summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, "```\n" + summary + "```\n", { flag: "a" });
}
process.exit(good === sorted.length && run.status === 0 ? 0 : 1);
