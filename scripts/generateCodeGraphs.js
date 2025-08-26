/* eslint-env node */
/**
 * Build module dependency and function call graphs for the codebase.
 *
 * @pseudocode
 * 1. Glob all JavaScript files under src, scripts, tests, and playwright.
 * 2. For each file:
 *    - Parse the source into an AST using acorn.
 *    - Record imported modules from `ImportDeclaration` nodes.
 *    - Collect named functions (declarations and variable assignments).
 *      * Gather called identifiers within each function body.
 *      * Detect simple architectural patterns (factory, observer, singleton).
 * 3. Assemble a graph object mapping modules to imports and functions.
 * 4. Write the resulting graph to `src/data/codeGraphs.json`.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import * as acorn from "acorn";
import { walk } from "estree-walker";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function getCallName(node) {
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression") return getCallName(node.property);
  return undefined;
}

function gatherCalls(node) {
  const calls = new Set();
  walk(node, {
    enter(n) {
      if (n.type === "CallExpression") {
        const name = getCallName(n.callee);
        if (name) calls.add(name);
      }
    }
  });
  return Array.from(calls);
}

function detectPatterns(name, calls) {
  const patterns = [];
  if (/^create[A-Z]/.test(name) || /Factory$/.test(name)) patterns.push("factory");
  if (
    (calls.includes("on") && calls.includes("emit")) ||
    (calls.includes("subscribe") && calls.includes("notify"))
  ) {
    patterns.push("observer");
  }
  if (/getInstance/i.test(name)) patterns.push("singleton");
  return patterns;
}

async function analyzeFile(relativePath) {
  const source = await readFile(path.join(rootDir, relativePath), "utf8");
  const ast = acorn.parse(source, { ecmaVersion: "latest", sourceType: "module" });
  const imports = [];
  const functions = {};

  for (const node of ast.body) {
    if (node.type === "ImportDeclaration") {
      imports.push(node.source.value);
    }
  }

  walk(ast, {
    enter(node) {
      if (node.type === "FunctionDeclaration" && node.id) {
        const calls = gatherCalls(node.body);
        functions[node.id.name] = { calls, patterns: detectPatterns(node.id.name, calls) };
      } else if (
        node.type === "VariableDeclarator" &&
        node.id.type === "Identifier" &&
        node.init &&
        (node.init.type === "FunctionExpression" || node.init.type === "ArrowFunctionExpression")
      ) {
        const calls = gatherCalls(node.init.body);
        functions[node.id.name] = { calls, patterns: detectPatterns(node.id.name, calls) };
      }
    }
  });

  return { imports: Array.from(new Set(imports)), functions };
}

async function generate() {
  const files = await glob("{src,scripts,tests,playwright}/**/*.js", {
    cwd: rootDir,
    ignore: ["**/node_modules/**"]
  });

  const modules = {};
  for (const file of files) {
    modules[file] = await analyzeFile(file);
  }

  await writeFile(
    path.join(rootDir, "src/data/codeGraphs.json"),
    JSON.stringify({ modules }, null, 2)
  );
}

await generate();
