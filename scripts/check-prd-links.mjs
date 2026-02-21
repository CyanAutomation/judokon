#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const PRD_GLOB_ROOT = path.resolve("design/productRequirementsDocuments");
const TARGET_FILES = (await import("glob")).globSync("prd*.md", {
  cwd: PRD_GLOB_ROOT,
  absolute: true
});
const MARKDOWN_LINK_REGEX = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function isExternalLink(target) {
  return (
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("mailto:") ||
    target.startsWith("tel:")
  );
}

let hasErrors = false;

for (const markdownFile of TARGET_FILES) {
  const contents = await readFile(markdownFile, "utf8");
  const lines = contents.split("\n");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];

    for (const match of line.matchAll(MARKDOWN_LINK_REGEX)) {
      const rawTarget = match[1].trim();
      if (!rawTarget || isExternalLink(rawTarget) || rawTarget.startsWith("#")) {
        continue;
      }

      const [pathPart] = rawTarget.split("#");
      const cleanedPath = pathPart.split("?")[0];
      const resolvedPath = path.resolve(path.dirname(markdownFile), cleanedPath);

      if (!existsSync(resolvedPath)) {
        hasErrors = true;
        console.error(
          `[prd-links] Missing target in ${path.relative(process.cwd(), markdownFile)}:${lineIndex + 1} -> ${rawTarget}`
        );
      }
    }
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log(
  `[prd-links] Validated ${TARGET_FILES.length} PRD markdown files under design/productRequirementsDocuments.`
);
