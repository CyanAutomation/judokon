#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const TARGET_PRDS = [
  "design/productRequirementsDocuments/prdBattleClassic.md",
  "design/productRequirementsDocuments/prdBattleScoreboard.md",
  "design/productRequirementsDocuments/prdTeamBattleRules.md",
  "design/productRequirementsDocuments/prdBattleBandit.md"
];

const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
let hasError = false;

for (const prdPath of TARGET_PRDS) {
  const absolutePrdPath = path.resolve(prdPath);
  const markdown = await readFile(absolutePrdPath, "utf8");
  const lines = markdown.split("\n");

  lines.forEach((line, index) => {
    if (!line.includes("**Test Coverage**")) {
      return;
    }

    for (const match of line.matchAll(markdownLinkPattern)) {
      const [, label, rawTarget] = match;

      if (
        rawTarget.startsWith("http://") ||
        rawTarget.startsWith("https://") ||
        rawTarget.startsWith("mailto:")
      ) {
        continue;
      }

      const cleanTarget = rawTarget.split("#")[0].split("?")[0];
      const resolvedPath = path.resolve(path.dirname(absolutePrdPath), cleanTarget);

      if (!existsSync(resolvedPath)) {
        hasError = true;
        console.error(
          `[prd-test-links] Missing link target in ${prdPath}:${index + 1} → ${rawTarget} (${label})`
        );
      }
    }
  });
}

if (hasError) {
  process.exit(1);
}

console.log("[prd-test-links] All Test Coverage links resolve to existing paths.");
