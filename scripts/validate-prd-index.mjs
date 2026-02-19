#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const PRD_ROOT = "design/productRequirementsDocuments";
const PRD_INDEX_PATH = path.join(PRD_ROOT, "prdIndex.json");

/**
 * Validate that each path listed in prdIndex.json exists under PRD root.
 *
 * @returns {Promise<string[]>} list of missing relative paths
 */
export async function validatePrdIndex() {
  const indexPath = path.resolve(PRD_INDEX_PATH);
  const json = await readFile(indexPath, "utf8");
  const entries = JSON.parse(json);

  if (!Array.isArray(entries)) {
    throw new Error("prdIndex.json must contain a JSON array of paths");
  }

  const rootAbs = path.resolve(PRD_ROOT);
  return entries.filter((entry) => {
    if (typeof entry !== "string" || !entry.trim()) return true;
    const resolved = path.resolve(rootAbs, entry);
    const isUnderRoot = resolved === rootAbs || resolved.startsWith(`${rootAbs}${path.sep}`);
    return !isUnderRoot || !existsSync(resolved);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const missing = await validatePrdIndex();
  if (missing.length) {
    missing.forEach((entry) => {
      console.error(`[prd-index] Missing file for manifest entry: ${entry}`);
    });
    process.exit(1);
  }
  console.log("[prd-index] All prdIndex.json entries resolve to existing files.");
}
