#!/usr/bin/env node

/**
 * CI script to check for canonical timers violations.
 * Runs ESLint with the canonical-timers rule and reports violations.
 * Can be configured to fail CI on violations or just warn.
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FAIL_ON_VIOLATIONS = process.env.CANONICAL_TIMERS_FAIL_CI === "1";
const VERBOSE = process.env.CANONICAL_TIMERS_VERBOSE === "1";

console.log("🔍 Checking for canonical timers violations...");

try {
  // Run ESLint on test files to check for canonical timers violations
  const eslintCommand = 'npx eslint "**/*.test.js" "**/*.spec.js" --max-warnings=0';
  const result = execSync(eslintCommand, {
    encoding: "utf8",
    cwd: join(__dirname, "..")
  });

  console.log("✅ No canonical timers violations found!");
  if (VERBOSE) {
    console.log(result);
  }
} catch (error) {
  const output = error.stdout || error.stderr || "";

  // Count violations
  const violationCount = (output.match(/canonical-timers\/useCanonicalTimers/g) || []).length;

  if (violationCount > 0) {
    console.log(`⚠️  Found ${violationCount} canonical timers violation(s):`);
    console.log("");
    console.log(output);

    if (FAIL_ON_VIOLATIONS) {
      console.log("");
      console.log("❌ CI configured to fail on canonical timers violations.");
      console.log("💡 Migrate to useCanonicalTimers() from tests/setup/fakeTimers.js");
      process.exit(1);
    } else {
      console.log("");
      console.log("ℹ️  CI configured to warn only (not fail) on canonical timers violations.");
      console.log("💡 Consider migrating to useCanonicalTimers() from tests/setup/fakeTimers.js");
    }
  } else {
    // Some other ESLint error
    console.log("❌ ESLint failed with errors:");
    console.log(output);
    process.exit(1);
  }
}

console.log("🎉 Canonical timers check complete!");
