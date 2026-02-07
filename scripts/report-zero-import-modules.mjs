#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { glob } from "glob";

const ROOTS = ["src/helpers", "src/pages"];
const SOURCE_GLOBS = [
  "src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,html}",
  "tests/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,html}",
  "playwright/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,html}",
  "scripts/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,html}",
  "docs/**/*.md",
  "design/**/*.md"
];

/**
 * Determine whether an import specifier references a module path using direct
 * file or directory-index forms.
 *
 * @pseudocode
 * 1. Normalize the specifier by converting backslashes to forward slashes.
 * 2. Generate candidate paths: full path, no extension, and directory (if index.js).
 * 3. Check if the normalized specifier matches any candidate path exactly or as a suffix.
 * 4. Return true if any candidate matches, false otherwise.
 *
 * @param {string} specifier import path specifier
 * @param {string} modulePath normalized module path with extension
 * @returns {boolean}
 */
function matchesModuleSpecifier(specifier, modulePath) {
  const normalizedSpecifier = specifier.replace(/\\/g, "/");
  const noExt = modulePath.replace(/\.js$/u, "");
  const indexDir = modulePath.endsWith("/index.js")
    ? modulePath.slice(0, -"/index.js".length)
    : null;

  const candidates = [modulePath, noExt];
  if (indexDir) candidates.push(indexDir);

  return candidates.some(
    (candidate) =>
      normalizedSpecifier === candidate ||
      normalizedSpecifier.endsWith(`/${candidate}`) ||
      normalizedSpecifier.endsWith(`/${candidate.replace(/^src\//u, "")}`)
  );
}

/**
 * Extract static and dynamic module specifiers from file text.
 *
 * @pseudocode
 * 1. Initialize an empty array to collect specifiers.
 * 2. Define regex pattern to match both static imports (from "...") and dynamic imports (import("...")).
 * 3. Iterate through all regex matches in the content.
 * 4. Extract the specifier from either capture group and add to array.
 * 5. Return the array of all found import/export specifiers.
 *
 * @param {string} content file text
 * @returns {string[]} import/export specifiers
 */
function extractSpecifiers(content) {
  const specifiers = [];
  const pattern = /(?:from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\))/gu;
  for (const match of content.matchAll(pattern)) {
    specifiers.push(match[1] ?? match[2]);
  }
  return specifiers;
}

/**
 * @param {string[]} argv cli args
 * @returns {{strict:boolean}}
 */
function parseArgs(argv) {
  return {
    strict: argv.includes("--strict")
  };
}

const { strict } = parseArgs(process.argv.slice(2));

const moduleFiles = (
  await Promise.all(
    ROOTS.map((root) =>
      glob(`${root}/**/*.js`, {
        ignore: ["**/node_modules/**", "**/client_embeddings.json"]
      })
    )
  )
)
  .flat()
  .sort();

const searchableFiles = (
  await Promise.all(
    SOURCE_GLOBS.map((pattern) =>
      glob(pattern, {
        ignore: [
          "**/node_modules/**",
          "**/client_embeddings.json",
          "src/data/codeGraphs.json",
          "src/data/offline_rag_metadata.json"
        ]
      })
    )
  )
).flat();

const fileSpecifiers = new Map();
for (const file of searchableFiles) {
  const text = await readFile(file, "utf8");
  fileSpecifiers.set(file.replace(/\\/g, "/"), extractSpecifiers(text));
}

const zeroImportModules = [];
for (const modulePathRaw of moduleFiles) {
  const modulePath = modulePathRaw.replace(/\\/g, "/");
  let hasImporter = false;

  for (const [file, specifiers] of fileSpecifiers) {
    if (file === modulePath) continue;
    if (specifiers.some((specifier) => matchesModuleSpecifier(specifier, modulePath))) {
      hasImporter = true;
      break;
    }
  }

  if (!hasImporter) {
    zeroImportModules.push(modulePath);
  }
}

if (zeroImportModules.length === 0) {
  console.log("✅ No zero-import JS modules detected under src/helpers or src/pages.");
  process.exit(0);
}

console.log("⚠️ Zero-import JS modules detected (review for stale shims/entrypoints):");
for (const modulePath of zeroImportModules) {
  console.log(` - ${modulePath}`);
}

if (strict) {
  process.exit(1);
}
