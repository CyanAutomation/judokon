#!/usr/bin/env node

/**
 * Check for banned patterns in Playwright test files.
 * This script prevents regressions of common anti-patterns in Playwright tests.
 *
 * Usage: node scripts/check-playwright-patterns.js [options]
 * Options:
 *   --json         Output results as JSON
 *   --verbose      Show verbose output
 *
 * Environment Variables:
 *   PLAYWRIGHT_PATTERNS_FAIL_ON_WARNING  Exit with error on warnings (default: false)
 *   PLAYWRIGHT_PATTERNS_VERBOSE          Enable verbose output (default: false)
 *   PLAYWRIGHT_PATTERNS_MAX_FILES        Maximum files to check (default: unlimited)
 *
 * Exit code: 0 if no banned patterns found, 1 if patterns found
 */

import fs from "fs";
import { execSync } from "child_process";

// Banned patterns that should not appear in Playwright tests
const BANNED_PATTERNS = [
  {
    pattern: "waitForTimeout",
    description: "Raw waitForTimeout calls (use semantic waits instead)",
    fixSuggestion: "Use page.waitForSelector() or expect().toBeVisible() instead",
    severity: "error"
  },
  {
    pattern: "setTimeout",
    description: "Raw setTimeout (use semantic waits instead)",
    fixSuggestion: "Use page.waitForSelector() or page.waitForLoadState() instead",
    severity: "error",
    exemptPaths: ["playwright/helpers/"] // Allow in test helpers for timeout guards
  },
  {
    pattern: "expect\\(true\\)\\.toBe\\(true\\)",
    description: "Placeholder assertions (use meaningful assertions)",
    fixSuggestion: "Replace with specific assertions like expect(element).toBeVisible()",
    severity: "error"
  },
  {
    pattern: "window\\.__test[^A-Za-z_]",
    description: "Private test hooks (use fixtures instead)",
    fixSuggestion: "Use Playwright fixtures or page.evaluate() with proper setup",
    severity: "error"
  },
  {
    pattern: "__battleCLIinit",
    description: "Removed internal CLI helpers (use public APIs)",
    fixSuggestion: "Use page fixtures and public test APIs",
    severity: "error"
  },
  {
    pattern: "dispatchEvent.*createEvent",
    description: "Synthetic event dispatching (use natural interactions)",
    fixSuggestion: "Use page.click(), page.fill(), or page.press() for user interactions",
    severity: "warning"
  },
  {
    pattern: "page\\.evaluate.*DOM",
    description: "Direct DOM manipulation in page.evaluate (use component APIs)",
    fixSuggestion: "Use page.locator() and built-in Playwright actions instead",
    severity: "warning"
  },
  {
    pattern: "innerHTML",
    description: "Direct innerHTML manipulation",
    fixSuggestion: "Use page.fill() or page.click() for user interactions",
    severity: "warning",
    exemptContexts: ["// Test functional behavior", "// Verify the toggle changed"] // Allow in comment context
  },
  {
    pattern: "appendChild",
    description: "Direct appendChild manipulation",
    fixSuggestion: "Use Playwright's locator API and natural interactions",
    severity: "warning"
  }
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const violations = [];
  const lines = content.split("\n");

  for (const {
    pattern,
    description,
    severity,
    fixSuggestion,
    exemptPaths,
    exemptContexts
  } of BANNED_PATTERNS) {
    const lineNumbers = [];
    const codeSnippets = [];
    const regex = new RegExp(pattern); // Non-global for line-by-line testing

    // Check if file path is exempt for this pattern
    const isFileExempt = exemptPaths?.some((exemptPath) => filePath.includes(exemptPath)) ?? false;

    lines.forEach((line, index) => {
      // Check for exemption comment on the line or previous line
      const prevLine = index > 0 ? lines[index - 1] : "";
      const hasExemption =
        line.includes("playwright-patterns: ignore") ||
        prevLine.includes("playwright-patterns: ignore-next-line");

      // Check for context exemptions (e.g., comments explaining alternatives)
      const hasContextExemption =
        exemptContexts?.some((ctx) => line.includes(ctx) || prevLine.includes(ctx)) ?? false;

      // Special exemption: setTimeout in Promise.race timeout guards (legitimate pattern)
      // Look for patterns like: setTimeout(() => { ... reject(new Error(...)) }, timeout)
      // Check 5 lines before and after to catch multi-line patterns
      const lookAheadLines = lines.slice(Math.max(0, index - 5), index + 6).join(" ");
      const isTimeoutGuard =
        pattern === "setTimeout" &&
        (lookAheadLines.includes("Promise.race") ||
          line.includes("clearTimeout") ||
          // Timeout guard pattern: setTimeout with reject and Error nearby
          (line.includes("setTimeout") &&
            (lookAheadLines.includes("reject(new Error") ||
              lookAheadLines.includes("reject(Error"))));

      if (
        regex.test(line) &&
        !hasExemption &&
        !isFileExempt &&
        !hasContextExemption &&
        !isTimeoutGuard
      ) {
        // Special case: __battleCLIinit cleanup is allowed
        if (pattern === "__battleCLIinit" && line.includes("delete globalThis.__battleCLIinit")) {
          return;
        }
        lineNumbers.push(index + 1);
        codeSnippets.push(line.trim());
      }
    });

    if (lineNumbers.length > 0) {
      violations.push({
        pattern,
        description,
        severity,
        fixSuggestion,
        count: lineNumbers.length,
        lines: lineNumbers,
        codeSnippets
      });
    }
  }

  return violations;
}

function findPlaywrightFiles() {
  try {
    const maxFiles = process.env.PLAYWRIGHT_PATTERNS_MAX_FILES;
    const limitCmd = maxFiles ? ` | head -${maxFiles}` : "";

    // Use git ls-files to find Playwright files, excluding node_modules and other irrelevant dirs
    const result = execSync(
      `git ls-files | grep "^playwright/" | grep -E "\\.(js|mjs|ts)$"${limitCmd}`,
      { encoding: "utf8" }
    );

    return result.trim().split("\n").filter(Boolean);
  } catch (error) {
    console.error("Error finding Playwright files:", error.message);
    return [];
  }
}

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const verbose = args.includes("--verbose") || process.env.PLAYWRIGHT_PATTERNS_VERBOSE === "true";
  const failOnWarning = process.env.PLAYWRIGHT_PATTERNS_FAIL_ON_WARNING === "true";

  if (!jsonOutput) {
    console.log("🔍 Checking Playwright files for banned patterns...\n");
  }

  const playwrightFiles = findPlaywrightFiles();

  if (playwrightFiles.length === 0) {
    if (!jsonOutput) {
      console.log("No Playwright files found.");
    }
    process.exit(0);
  }

  let totalViolations = 0;
  let errorCount = 0;
  let warningCount = 0;
  const fileResults = [];

  for (const file of playwrightFiles) {
    const violations = checkFile(file);

    if (violations.length > 0) {
      fileResults.push({ file, violations });

      if (!jsonOutput) {
        console.log(`❌ ${file}:`);

        for (const violation of violations) {
          const icon = violation.severity === "error" ? "🚫" : "⚠️";
          console.log(`  ${icon} ${violation.pattern}: ${violation.description}`);
          console.log(
            `    Found ${violation.count} occurrence(s) on lines: ${violation.lines.join(", ")}`
          );

          if (verbose && violation.codeSnippets) {
            console.log(`    Code samples:`);
            violation.codeSnippets.slice(0, 3).forEach((snippet) => {
              console.log(`      ${snippet}`);
            });
          }

          if (violation.fixSuggestion) {
            console.log(`    💡 Fix: ${violation.fixSuggestion}`);
          }

          totalViolations += violation.count;
          if (violation.severity === "error") {
            errorCount += violation.count;
          } else {
            warningCount += violation.count;
          }
        }

        console.log("");
      } else {
        // Count violations for JSON output
        for (const violation of violations) {
          totalViolations += violation.count;
          if (violation.severity === "error") {
            errorCount += violation.count;
          } else {
            warningCount += violation.count;
          }
        }
      }
    }
  }

  const summary = {
    filesChecked: playwrightFiles.length,
    totalViolations,
    errors: errorCount,
    warnings: warningCount
  };

  if (jsonOutput) {
    console.log(
      JSON.stringify(
        {
          summary,
          violations: fileResults
        },
        null,
        2
      )
    );
  } else {
    console.log(`📊 Summary:`);
    console.log(`  Files checked: ${summary.filesChecked}`);
    console.log(`  Total violations: ${summary.totalViolations}`);
    console.log(`  Errors: ${summary.errors}`);
    console.log(`  Warnings: ${summary.warnings}`);
  }

  if (errorCount > 0) {
    if (!jsonOutput) {
      console.log("\n🚫 Errors found! Please fix the banned patterns before committing.");
      console.log("💡 Tip: Use semantic waits, meaningful assertions, and public test APIs.");
      console.log("💡 To ignore a specific line, add: // playwright-patterns: ignore-next-line");
    }
    process.exit(1);
  } else if (warningCount > 0) {
    if (!jsonOutput) {
      console.log("\n⚠️ Warnings found. Consider refactoring to use better patterns.");
      if (failOnWarning) {
        console.log("🚫 Exiting with error due to PLAYWRIGHT_PATTERNS_FAIL_ON_WARNING=true");
      }
    }
    process.exit(failOnWarning ? 1 : 0);
  } else {
    if (!jsonOutput) {
      console.log("\n✅ No banned patterns found! 🎉");
    }
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkFile, BANNED_PATTERNS };
