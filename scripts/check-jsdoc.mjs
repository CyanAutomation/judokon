#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";

// Recursively list files under a directory
export async function walk(dir, ext = ".js") {
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

export function findExportedSymbols(content) {
  const lines = content.split(/\n/);
  const results = [];

  const exportFnRegex = /^\s*export\s+(async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/;
  const exportVarRegex =
    /^\s*export\s+(const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?(?:function|\(|[A-Za-z0-9_$]+)/;
  const exportDefaultFnRegex =
    /^\s*export\s+default\s+(?:async\s+)?function(?:\s+([A-Za-z0-9_$]+))?\s*\(/;
  const exportNamedRegex = /^\s*export\s+\{([^}]+)\}/;

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
    m = line.match(exportNamedRegex);
    if (m) {
      const names = m[1]
        .split(",")
        .map((name) => name.trim().split(" as ")[1] || name.trim().split(" as ")[0]);
      for (const name of names) {
        results.push({ name, line: i + 1, type: "named" });
      }
      continue;
    }
  }
  return results;
}

export function validateJsDoc(lines, index) {
  let j = index - 1;
  while (j >= 0 && (/^\s*$/.test(lines[j]) || /^\s*\/\//.test(lines[j]))) j--;
  if (j < 0) return false;
  if (!/\*\//.test(lines[j])) return false;

  let start = j;
  while (start >= 0 && !/\/\*\*/.test(lines[start])) start--;
  if (start < 0) return false;

  if (!/\/\*\*/.test(lines[start])) return false;

  const block = lines.slice(start, j + 1).join("\n");
  if (!/@pseudocode\b/.test(block)) return false;

  // Extract function signature to check for params and return
  const signature = lines[index];
  const hasParams = /\(([^)]*)\)/.exec(signature)?.[1].trim().length > 0;
  const returnsValue =
    (!/=>\s*\{/.test(signature) &&
      !/function\s+[A-Za-z0-9_$]+\s*\([^)]*\)\s*\{\}/.test(signature)) ||
    /return\s+/.test(signature);

  const hasParamTag = /@param\b/.test(block);
  const hasReturnTag = /@returns\b/.test(block);

  if (hasParams && !hasParamTag) return false;
  if (returnsValue && !hasReturnTag) return false;

  const summary = lines[start + 1].replace(/\*/, "").trim();
  if (summary.length === 0) return false;

  return true;
}

export async function checkFiles(files) {
  const problems = [];
  for (const f of files) {
    const rel = path.relative(process.cwd(), f);
    const src = await fs.readFile(f, "utf8");
    const symbols = findExportedSymbols(src);
    if (symbols.length === 0) continue;
    const lines = src.split(/\n/);
    for (const sym of symbols) {
      const idx = sym.line - 1;
      const ok = validateJsDoc(lines, idx);
      if (!ok) problems.push({ file: rel, name: sym.name, line: sym.line });
    }
  }
  return problems;
}