#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";

// Recursively list files under a directory
async function walk(dir, ext = ".js") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await walk(full, ext)));
    } else if (e.isFile() && e.name.endsWith(ext)) {
      files.push(full);
    }
  }
  return files;
}

function findExportedSymbols(content) {
  const lines = content.split(/\n/);
  const results = [];

  const exportFnRegex = /^\s*export\s+(async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/;
  const exportVarRegex =
    /^\s*export\s+(const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?(?:function|\(|[A-Za-z0-9_$]+)/;
  const exportDefaultFnRegex = /^\s*export\s+default\s+function\s+([A-Za-z0-9_$]+)?\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m = line.match(exportFnRegex);
    if (m) {
      results.push({ name: m[2], line: i + 1, type: "function" });
      continue;
    }
    m = line.match(exportVarRegex);
    if (m) {
      results.push({ name: m[2], line: i + 1, type: "variable" });
      continue;
    }
    m = line.match(exportDefaultFnRegex);
    if (m) {
      results.push({ name: m[1] || "default", line: i + 1, type: "default-function" });
      continue;
    }
  }
  return results;
}

function hasJsDocAbove(lines, index) {
  // index is 0-based line index where export statement is
  let j = index - 1;
  // skip blank lines and single-line comments
  while (j >= 0 && (/^\s*$/.test(lines[j]) || /^\s*\/\//.test(lines[j]))) j--;
  if (j < 0) return false;
  if (!/\*\//.test(lines[j])) return false;
  // find start of block
  let start = j;
  while (start >= 0 && !/\/\*\*/.test(lines[start])) start--;
  if (start < 0) return false;
  // confirm it's a /** block (JSDoc)
  if (!/\/\*\*/.test(lines[start])) return false;
  // Basic sanity: ensure block contains @pseudocode (project standard) and
  // optionally @param/@returns when configured externally.
  const block = lines.slice(start, j + 1).join("\n");
  if (!/@pseudocode\b/.test(block)) return false;
  // If present, consider it valid. Further checks (param/returns) are optional.
  return true;
}

async function checkHelpers(dir = "src/helpers") {
  const base = path.resolve(dir);
  try {
    const files = await walk(base, ".js");
    const problems = [];
    for (const f of files) {
      const rel = path.relative(process.cwd(), f);
      const src = await fs.readFile(f, "utf8");
      const symbols = findExportedSymbols(src);
      if (symbols.length === 0) continue;
      const lines = src.split(/\n/);
      for (const sym of symbols) {
        const idx = sym.line - 1;
        const ok = hasJsDocAbove(lines, idx);
        if (!ok) problems.push({ file: rel, name: sym.name, line: sym.line });
      }
    }

    if (problems.length === 0) {
      console.log("All exported functions in", dir, "have JSDoc blocks (basic check).");
      return 0;
    }

    console.log("\nFunctions missing JSDoc blocks:");
    for (const p of problems) {
      console.log(` - ${p.file}:${p.line} -> ${p.name}`);
    }
    console.log(`\nTotal missing: ${problems.length}`);
    return 2;
  } catch (err) {
    console.error("Error scanning", err);
    return 1;
  }
}

(async function main() {
  const dir = process.argv[2] || "src/helpers";
  const code = await checkHelpers(dir);
  process.exit(code);
})();
