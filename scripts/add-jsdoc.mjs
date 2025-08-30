#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { walk, findExportedSymbols, validateJsDoc } from "./check-jsdoc.mjs";

async function addJsDoc(file) {
  const content = await fs.readFile(file, "utf8");
  const lines = content.split("\n");
  const symbols = findExportedSymbols(content);
  let modified = false;

  for (const sym of symbols.reverse()) {
    const idx = sym.line - 1;
    if (!validateJsDoc(lines, idx)) {
      const jsdoc = `/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */`;
      lines.splice(idx, 0, jsdoc);
      modified = true;
    }
  }

  if (modified) {
    const newContent = lines.join("\n");
    await fs.writeFile(file, newContent, "utf8");
    console.log(`Added JSDoc to ${file}`);
  }
}

(async function main() {
  const args = process.argv.slice(2);
  const dirs = args.length > 0 ? args : ["src"];
  let allFiles = [];

  try {
    for (const dir of dirs) {
      const base = path.resolve(dir);
      const files = await walk(base, ".js");
      allFiles.push(...files);
    }

    for (const file of allFiles) {
      await addJsDoc(file);
    }

    console.log("\nFinished adding JSDoc blocks.");
    process.exit(0);
  } catch (err) {
    console.error("Error adding JSDoc", err);
    process.exit(1);
  }
})();
