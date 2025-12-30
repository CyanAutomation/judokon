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

export function validateJsDoc(lines, index, symbolType = "function") {
  let j = index - 1;
  while (j >= 0 && (/^\s*$/.test(lines[j]) || /^\s*\/\//.test(lines[j]))) j--;
  if (j < 0) return "No JSDoc block found preceding the symbol.";
  if (!/\*\//.test(lines[j])) return "No closing JSDoc block (*/) found before the symbol.";

  let start = j;
  while (start >= 0 && !/\/\*\*/.test(lines[start])) start--;
  if (start < 0) return "No JSDoc block found.";

  if (!/\/\*\*/.test(lines[start])) return "No opening JSDoc block (/**) found for the symbol.";

  const block = lines.slice(start, j + 1).join("\n");
  // The @pseudocode tag is only required for functions
  if (symbolType === "function" && !/@pseudocode\b/.test(block)) {
    return "Missing @pseudocode tag. All functions require a @pseudocode section.";
  }

  // Extract function signature to check for params and return
  const signature = lines[index];
  const hasParams =
    symbolType !== "variable" && /\(([^)]*)\)/.exec(signature)?.[1].trim().length > 0;
  const returnsValue =
    symbolType !== "variable" &&
    ((!/=>\s*\{/.test(signature) &&
      !/function\s+[A-Za-z0-9_$]+\s*\([^)]*\)\s*\{\}/.test(signature)) ||
      /return\s+/.test(signature));

  const hasParamTag = /@param\b/.test(block);
  const hasReturnTag = /@returns\b/.test(block);

  if (hasParams && !hasParamTag) {
    return "Missing @param tag(s). Function has parameters but no @param tags were found.";
  }

  // All functions must have an @returns tag.
  if (symbolType === "function" && !hasReturnTag) {
    if (returnsValue) {
      return "Missing @returns tag. Function returns a value but no @returns tag was found.";
    } else {
      return "Missing @returns tag. All functions require an @returns tag. Consider adding `@returns {void}` if the function does not return a meaningful value.";
    }
  }

  const cleanedLines = block
    .split(/\n/)
    .map((line) =>
      line
        .replace(/^\s*\/?\**\s?/, "")
        .replace(/\*\/\s*$/, "")
        .trim()
    )
    .filter(Boolean);

  if (cleanedLines.length === 0) return "JSDoc block is empty or contains only JSDoc markers.";

  const summaryLine = cleanedLines[0];
  const isSummaryTag = summaryLine.startsWith("@summary");
  const hasNonWhitespaceContent = summaryLine.trim().length > 0;

  // If the first meaningful line is a tag (not a summary), or if there's no actual summary content
  if ((summaryLine.startsWith("@") && !isSummaryTag) || !hasNonWhitespaceContent) {
    return "Missing or invalid summary line in JSDoc block. A concise description is required at the beginning of the JSDoc.";
  }

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
      const validationResult = validateJsDoc(lines, idx, sym.type);
      if (validationResult !== true) {
        problems.push({ file: rel, name: sym.name, line: sym.line, message: validationResult });
      }
    }
  }
  return problems;
}

async function main() {
  const files = await walk(path.join(process.cwd(), "src"), ".js");
  const problems = await checkFiles(files);

  if (problems.length > 0) {
    console.error("JSDoc validation errors found:");
    for (const p of problems) {
      console.error(` - ${p.file}:${p.line} -> ${p.name}: ${p.message}`);
    }
    process.exit(1);
  } else {
    console.log("All exported symbols in src have valid JSDoc blocks.");
  }
}

main().catch((err) => {
  console.error("Error during JSDoc check:", err);
  process.exit(1);
});
