/* eslint-env node */
/**
 * Collect test statistics and generate a random judo throw message.
 *
 * @pseudocode
 * 1. Count snapshot PNGs and test files.
 * 2. Count Vitest and Playwright test cases.
 * 3. Get changed snapshot files from git.
 * 4. Roll a six-sided die to select a judo throw message.
 * 5. Write all results to `$GITHUB_OUTPUT` for workflow consumption.
 */
import { glob } from "glob";
import { readFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

function defaultExec(cmd, options) {
  return execSync(cmd, { encoding: "utf8", ...options }).trim();
}

/**
 * Collect stats for tests and snapshots within a project directory.
 *
 * @pseudocode
 * 1. Count snapshot images in `test-results/`.
 * 2. Count Playwright and Vitest test files.
 * 3. Scan test source files for `test(` or `it(` invocations.
 * 4. Use `git diff` to count updated snapshots.
 * 5. Return all collected counts.
 *
 * @param {string} [root=process.cwd()] - Directory to search.
 * @param {(cmd: string, options?: object) => string} [execFn=defaultExec] - Function to execute shell commands.
 * @returns {Promise<{snapshots:number, testfiles:number, testcases:number, updated:number}>}
 */
export async function collectTestStats(root = process.cwd(), execFn = defaultExec) {
  const snapshots = (await glob("test-results/**/*.png", { cwd: root })).length;
  const playwrightTests = (await glob("playwright/**/*.spec.@(js|ts)", { cwd: root })).length;
  const vitestTests = (await glob("tests/**/*.{test,spec}.@(js|ts)", { cwd: root })).length;
  const testfiles = playwrightTests + vitestTests;

  const sourceFiles = await glob(["tests/**/*.@(js|ts)", "playwright/**/*.@(js|ts)"], {
    cwd: root
  });
  let testcases = 0;
  for (const file of sourceFiles) {
    const content = await readFile(path.join(root, file), "utf8");
    testcases += (content.match(/\b(?:test|it)\s*\(/g) || []).length;
  }

  const diff = execFn("git diff --name-only", { cwd: root });
  const updated = diff.split("\n").filter((f) => /^test-results\/.*\.png$/.test(f.trim())).length;

  return { snapshots, testfiles, testcases, updated };
}

const moods = {
  1: "🎲 Roll: 1 — *Seoi Nage* lightning strike! ⚡️ Shoulder throw supremacy.",
  2: "🎲 Roll: 2 — *Osoto Gari* sweep! 🌪 The ground says hello.",
  3: "🎲 Roll: 3 — *Uchi Mata* whirl! 🌀 You’re airborne now.",
  4: "🎲 Roll: 4 — *Harai Goshi* slash! 🌊 A clean hip-and-leg combo.",
  5: "🎲 Roll: 5 — *Tai Otoshi* drop! 💥 Straight to the tatami.",
  6: "🎲 Roll: 6 — *Kouchi Gari* trip! 🎯 Small but deadly."
};

/**
 * Roll a six-sided die and return a judo throw description.
 *
 * @pseudocode
 * 1. Generate a random integer from 1 to 6.
 * 2. Map the number to a predefined judo throw message.
 * 3. Return the selected message.
 *
 * @param {() => number} [rand=Math.random] - Random number generator.
 * @returns {string}
 */
export function rollDice(rand = Math.random) {
  const value = Math.floor(rand() * 6) + 1;
  return moods[value];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const stats = await collectTestStats();
  const mood = rollDice();
  const lines = [
    `snapshots=${stats.snapshots}`,
    `testfiles=${stats.testfiles}`,
    `testcases=${stats.testcases}`,
    `updated=${stats.updated}`,
    `mood=${mood}`
  ];
  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    await appendFile(output, lines.join("\n") + "\n");
  } else {
    console.log(lines.join("\n"));
  }
}
