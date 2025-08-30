#!/usr/bin/env node
import path from "path";
import { walk, checkFiles } from "./check-jsdoc.mjs";

(async function main() {
  const args = process.argv.slice(2);
  const dirs = args.length > 0 ? args : ["src"];
  let allFiles = [];

  try {
    for(const dir of dirs) {
        const base = path.resolve(dir);
        const files = await walk(base, ".js");
        allFiles.push(...files)
    }

    const problems = await checkFiles(allFiles);

    if (problems.length === 0) {
      console.log("All exported symbols in", dirs.join(', '), "have valid JSDoc blocks.");
      process.exit(0);
    }

    console.log("\nFunctions missing or with incomplete JSDoc blocks:");
    for (const p of problems) {
      console.log(` - ${p.file}:${p.line} -> ${p.name}`);
    }
    console.log(`\nTotal missing: ${problems.length}`);
    process.exit(2);
  } catch (err) {
    console.error("Error scanning", err);
    process.exit(1);
  }
})();