#!/usr/bin/env node

/**
 * Check for banned patterns in Playwright test files.
 * This script prevents regressions of common anti-patterns in Playwright tests.
 *
 * Usage: node scripts/check-playwright-patterns.js
 * Exit code: 0 if no banned patterns found, 1 if patterns found
 */

import fs from "fs";
import { execSync } from "child_process";

// Banned patterns that should not appear in Playwright tests
const BANNED_PATTERNS = [
  {
    pattern: "waitForTimeout",
    description: "Raw waitForTimeout calls (use semantic waits instead)",
    severity: "error"
  },
  {
    pattern: "expect\\(true\\)\\.toBe\\(true\\)",
    description: "Placeholder assertions (use meaningful assertions)",
    severity: "error"
  },
  {
    pattern: "window\\.__test[^A-Za-z_]",
    description: "Private test hooks (use fixtures instead)",
    severity: "error"
  },
  {
    pattern: "__battleCLIinit",
    description: "Removed internal CLI helpers (use public APIs)",
    severity: "error"
  },
  {
    pattern: "dispatchEvent.*createEvent",
    description: "Synthetic event dispatching (use natural interactions)",
    severity: "warning"
  },
  {
    pattern: "page\\.evaluate.*DOM",
    description: "Direct DOM manipulation in page.evaluate (use component APIs)",
    severity: "warning"
  }
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const violations = [];

  for (const { pattern, description, severity } of BANNED_PATTERNS) {
    const regex = new RegExp(pattern, "g");
    const matches = content.match(regex);

    if (matches) {
      // Get line numbers for each match
      const lines = content.split("\n");
      const lineNumbers = [];

      lines.forEach((line, index) => {
        if (regex.test(line)) {
          lineNumbers.push(index + 1);
        }
      });

      violations.push({
        pattern,
        description,
        severity,
        count: matches.length,
        lines: lineNumbers
      });
    }
  }

  return violations;
}

function findPlaywrightFiles() {
  try {
    // Use git ls-files to find Playwright files, excluding node_modules and other irrelevant dirs
    const result = execSync(
      'git ls-files | grep "^playwright/" | grep -E "\\.(js|mjs|ts)$" | head -50',
      { encoding: "utf8" }
    );

    return result.trim().split("\n").filter(Boolean);
  } catch (error) {
    console.error("Error finding Playwright files:", error.message);
    return [];
  }
}

function main() {
  console.log("🔍 Checking Playwright files for banned patterns...\n");

  const playwrightFiles = findPlaywrightFiles();

  if (playwrightFiles.length === 0) {
    console.log("No Playwright files found.");
    process.exit(0);
  }

  let totalViolations = 0;
  let errorCount = 0;
  let warningCount = 0;

  for (const file of playwrightFiles) {
    const violations = checkFile(file);

    if (violations.length > 0) {
      console.log(`❌ ${file}:`);

      for (const violation of violations) {
        const icon = violation.severity === "error" ? "🚫" : "⚠️";
        console.log(`  ${icon} ${violation.pattern}: ${violation.description}`);
        console.log(
          `    Found ${violation.count} occurrence(s) on lines: ${violation.lines.join(", ")}`
        );

        totalViolations += violation.count;
        if (violation.severity === "error") {
          errorCount += violation.count;
        } else {
          warningCount += violation.count;
        }
      }

      console.log("");
    }
  }

  console.log(`📊 Summary:`);
  console.log(`  Files checked: ${playwrightFiles.length}`);
  console.log(`  Total violations: ${totalViolations}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Warnings: ${warningCount}`);

  if (errorCount > 0) {
    console.log("\n🚫 Errors found! Please fix the banned patterns before committing.");
    console.log("💡 Tip: Use semantic waits, meaningful assertions, and public test APIs.");
    process.exit(1);
  } else if (warningCount > 0) {
    console.log("\n⚠️ Warnings found. Consider refactoring to use better patterns.");
    process.exit(0);
  } else {
    console.log("\n✅ No banned patterns found! 🎉");
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkFile, BANNED_PATTERNS };
