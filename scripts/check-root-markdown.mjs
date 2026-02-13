#!/usr/bin/env node

import { readdir } from "node:fs/promises";

const ROOT_MARKDOWN_ALLOWLIST = new Set([
  "AGENTS.md",
  "CONTRIBUTING.md",
  "GEMINI.md",
  "README.md",
  "LAYOUT_EDITOR_IMPLEMENTATION_PROPOSAL.md",
  "quitFlowIssue.md",
  "report.md",
  "sample-test-failures.md",
  "snackBarIssue.md"
]);

const additionalAllowlist = (process.env.ROOT_MARKDOWN_ALLOWLIST ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

for (const fileName of additionalAllowlist) {
  ROOT_MARKDOWN_ALLOWLIST.add(fileName);
}

const entries = await readdir(".", { withFileTypes: true });
const unexpected = entries
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
  .map((entry) => entry.name)
  .filter((name) => !ROOT_MARKDOWN_ALLOWLIST.has(name))
  .sort((a, b) => a.localeCompare(b));

if (unexpected.length > 0) {
  console.error("Unexpected root-level markdown files found:");
  for (const file of unexpected) {
    console.error(`- ${file}`);
  }
  console.error(
    "Move status docs under docs/status/{active,archive,reference} or add explicit allowlist via ROOT_MARKDOWN_ALLOWLIST."
  );
  process.exit(1);
}

console.log("Root markdown policy check passed.");
