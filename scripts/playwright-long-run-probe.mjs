#!/usr/bin/env node

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function createRunDirectory(baseDir) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(baseDir, timestamp);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    repeatEach: 10
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if ((arg === "-r" || arg === "--repeat-each") && args[i + 1]) {
      config.repeatEach = Number.parseInt(args[i + 1], 10);
      i += 1;
    } else if (arg.startsWith("--repeat-each=")) {
      config.repeatEach = Number.parseInt(arg.split("=")[1], 10);
    } else if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      console.warn(`Ignoring unknown argument: ${arg}`);
    }
  }

  if (Number.isNaN(config.repeatEach) || config.repeatEach < 1) {
    throw new Error(`Invalid repeat count "${config.repeatEach}". Use a positive integer.`);
  }

  return config;
}

function printHelp() {
  console.log(`Run the long-run hang Playwright probe.

Usage:
  node scripts/playwright-long-run-probe.mjs [options]

Options:
  -r, --repeat-each <count>   Number of probe iterations (default: 10)
  -h, --help                  Show this message
`);
}

async function main() {
  const { repeatEach } = parseArgs();

  const reportsRoot = path.join(REPO_ROOT, "reports", "long-run-probe");
  await ensureDir(reportsRoot);

  const runDir = createRunDirectory(reportsRoot);
  await ensureDir(runDir);

  const jsonReportPath = path.join(runDir, "results.json");

  console.log(`▶️  Running long-run probe with repeat-each=${repeatEach}. Artifacts: ${runDir}`);

  const cliArgs = [
    "playwright",
    "test",
    "playwright/battle-classic/long-run-hang-probe.spec.js",
    `--repeat-each=${repeatEach}`,
    "--reporter=list",
    `--reporter=json=${jsonReportPath}`
  ];

  const child = spawn("npx", cliArgs, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      PW_TEST_CAPTURE_TRACE: "on-first-retry"
    }
  });

  child.on("close", (code) => {
    if (code === 0) {
      console.log(`✅ Probe completed successfully. Reports stored in ${runDir}`);
    } else {
      console.error(
        `❌ Probe failed with exit code ${code}. Inspect JSON report and Playwright artifacts in ${runDir}`
      );
    }
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error("Failed to run Playwright probe:", error);
  process.exit(1);
});
