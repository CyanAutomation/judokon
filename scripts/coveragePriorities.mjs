import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const COVERAGE_PATH = path.resolve("coverage/coverage-final.json");
const OUTPUT_PATH = path.resolve("docs/testing/coverage-priorities.md");
const CORE_DIRS = ["src/helpers/", "src/components/", "src/pages/"];
const MIN_TOTAL_ENTRIES = 10;
const BRANCH_PCT_THRESHOLD = 50;
const BRANCH_DEFAULT_LIMIT = 5;
const CHURN_DEFAULT_LIMIT = 5;

const fileExists = (targetPath) => fs.existsSync(targetPath);

const formatPercent = (value) => `${value.toFixed(1)}%`;

const toRelativePath = (filePath) => {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.startsWith(process.cwd().replace(/\\/g, "/"))) {
    return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  }
  return normalized.startsWith("/") ? normalized.slice(1) : normalized;
};

const getCoverageTotals = (counts = {}) => {
  const totals = Object.values(counts);
  const total = totals.length;
  const covered = totals.filter((value) => value > 0).length;
  return { total, covered, pct: total === 0 ? 100 : (covered / total) * 100 };
};

const getBranchTotals = (branches = {}) => {
  const entries = Object.values(branches).flat();
  const total = entries.length;
  const covered = entries.filter((value) => value > 0).length;
  return { total, covered, pct: total === 0 ? 100 : (covered / total) * 100 };
};

const loadCoverage = () => {
  if (!fileExists(COVERAGE_PATH)) {
    console.error(
      `Coverage file not found at ${COVERAGE_PATH}. Run npm run test:cov first.`,
    );
    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(COVERAGE_PATH, "utf8"));
  } catch (error) {
    console.error(`Failed to parse coverage file: ${error.message}`);
    process.exit(1);
  }
};

const getCoverageEntries = (coverageData) =>
  Object.entries(coverageData)
    .map(([filePath, data]) => {
      if (!data || typeof data !== "object") {
        console.warn(`Invalid coverage data for ${filePath}, skipping`);
        return null;
      }

      if (
        !data.s || typeof data.s !== "object" ||
        !data.f || typeof data.f !== "object" ||
        !data.b || typeof data.b !== "object"
      ) {
        console.warn(`Missing coverage buckets for ${filePath}, skipping`);
        return null;
      }

      const relativePath = toRelativePath(filePath);
      const statements = getCoverageTotals(data.s);
      const functions = getCoverageTotals(data.f);
      const branches = getBranchTotals(data.b);
      return {
        filePath: relativePath,
        statements,
        functions,
        branches,
      };
    })
    .filter((entry) => entry && entry.filePath.startsWith("src/"));

const buildChurnMap = () => {
  let output = "";
  try {
    output = execSync(
      "git log --name-only --since=90.days --pretty=format: -- src",
      { encoding: "utf8" },
    );
  } catch (error) {
    console.error("Unable to read git log for churn:", error.message);
    return new Map();
  }

  const churn = new Map();
  output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((filePath) => {
      const relativePath = toRelativePath(filePath);
      if (!relativePath.startsWith("src/")) {
        return;
      }
      churn.set(relativePath, (churn.get(relativePath) ?? 0) + 1);
    });

  return churn;
};

const addUnique = (list, used, item) => {
  if (used.has(item.filePath)) {
    return;
  }
  list.push(item);
  used.add(item.filePath);
};

const formatEntry = (entry, { includeChurn = false } = {}) => {
  const statementSummary = `${entry.statements.covered}/${entry.statements.total}`;
  const functionSummary = `${entry.functions.covered}/${entry.functions.total}`;
  const branchSummary = `${entry.branches.covered}/${entry.branches.total}`;
  const churnInfo = includeChurn
    ? `, churn=${entry.churnCount ?? 0}`
    : "";
  return `- \`${entry.filePath}\` — statements ${statementSummary} (${formatPercent(
    entry.statements.pct,
  )}), functions ${functionSummary} (${formatPercent(
    entry.functions.pct,
  )}), branches ${branchSummary} (${formatPercent(
    entry.branches.pct,
  )})${churnInfo}`;
};

const ensureDirectory = (targetPath) => {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
};

const coverageData = loadCoverage();
const coverageEntries = getCoverageEntries(coverageData);
const churnMap = buildChurnMap();
const used = new Set();

const entryWiringZero = [];
coverageEntries
  .filter(
    (entry) =>
      (entry.statements.total > 0 && entry.statements.covered === 0) ||
      (entry.functions.total > 0 && entry.functions.covered === 0),
  )
  .sort((a, b) => a.statements.pct - b.statements.pct)
  .forEach((entry) => addUnique(entryWiringZero, used, entry));

const lowBranchCandidates = coverageEntries
  .filter((entry) => entry.branches.total > 0)
  .sort((a, b) => a.branches.pct - b.branches.pct);

const lowBranchCoverage = [];
lowBranchCandidates
  .filter((entry) => entry.branches.pct < BRANCH_PCT_THRESHOLD)
  .slice(0, BRANCH_DEFAULT_LIMIT)
  .forEach((entry) => addUnique(lowBranchCoverage, used, entry));

if (lowBranchCoverage.length < BRANCH_DEFAULT_LIMIT) {
  lowBranchCandidates
    .slice(0, BRANCH_DEFAULT_LIMIT)
    .forEach((entry) => addUnique(lowBranchCoverage, used, entry));
}

const coreChurnCandidates = coverageEntries
  .filter((entry) => CORE_DIRS.some((dir) => entry.filePath.startsWith(dir)))
  .map((entry) => ({
    ...entry,
    churnCount: churnMap.get(entry.filePath) ?? 0,
  }))
  .sort((a, b) => b.churnCount - a.churnCount);

const highChurnLowCoverage = [];
coreChurnCandidates
  .slice(0, 20)
  .sort((a, b) => a.statements.pct - b.statements.pct)
  .slice(0, CHURN_DEFAULT_LIMIT)
  .forEach((entry) => addUnique(highChurnLowCoverage, used, entry));

const totalEntries =
  entryWiringZero.length + lowBranchCoverage.length + highChurnLowCoverage.length;

if (totalEntries < MIN_TOTAL_ENTRIES) {
  lowBranchCandidates.forEach((entry) => {
    if (
      entryWiringZero.length +
        lowBranchCoverage.length +
        highChurnLowCoverage.length >=
      MIN_TOTAL_ENTRIES
    ) {
      return;
    }
    addUnique(lowBranchCoverage, used, entry);
  });
}

if (
  entryWiringZero.length + lowBranchCoverage.length + highChurnLowCoverage.length <
  MIN_TOTAL_ENTRIES
) {
  coreChurnCandidates.forEach((entry) => {
    if (
      entryWiringZero.length +
        lowBranchCoverage.length +
        highChurnLowCoverage.length >=
      MIN_TOTAL_ENTRIES
    ) {
      return;
    }
    addUnique(highChurnLowCoverage, used, entry);
  });
}

const lines = [
  "# Coverage priorities",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Entry/Wiring 0% smoke tests",
  "",
  entryWiringZero.length
    ? entryWiringZero.map((entry) => formatEntry(entry)).join("\n")
    : "- _None found_",
  "",
  "## Low branch coverage (decision-heavy)",
  "",
  lowBranchCoverage.length
    ? lowBranchCoverage.map((entry) => formatEntry(entry)).join("\n")
    : "- _None found_",
  "",
  "## Core modules touched often (high churn)",
  "",
  highChurnLowCoverage.length
    ? highChurnLowCoverage
        .map((entry) => formatEntry(entry, { includeChurn: true }))
        .join("\n")
    : "- _None found_",
  "",
  "## Notes",
  "",
  "- Group 1 flags files with zero executed statements or functions.",
  "- Group 2 highlights decision-heavy files with weak branch coverage.",
  "- Group 3 prioritizes frequently touched helpers/components/pages with lower coverage.",
  "",
];

ensureDirectory(OUTPUT_PATH);
fs.writeFileSync(OUTPUT_PATH, lines.join("\n"));

console.log(`Coverage priorities written to ${OUTPUT_PATH}`);
