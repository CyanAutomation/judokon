#!/usr/bin/env node
import path from "path";
import fs from "fs/promises";
import * as checker from "./check-jsdoc.mjs";

async function main() {
  const dir = process.argv[2] || "src/helpers";
  const absDir = path.resolve(dir);
  const files = await checker.walk(absDir, ".js");
  const problems = await checker.checkFiles(files);
  const out = { dir: String(dir), total: problems.length, problems };
  const outPath = "/tmp/check-jsdoc-results.json";
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log("Wrote results to", outPath);
  if (problems.length === 0) process.exit(0);
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
import { walk, checkFiles } from "./check-jsdoc.mjs";

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

    const problems = await checkFiles(allFiles);

    if (problems.length === 0) {
      console.log("All exported symbols in", dirs.join(", "), "have valid JSDoc blocks.");
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
