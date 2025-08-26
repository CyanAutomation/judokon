/* eslint-env node */
/**
 * Generate embeddings for PRD markdown, JSON data, and JS source files.
 *
 * @pseudocode
 * 1. Use glob to gather markdown, JSON, and JS sources, skipping existing
 *    `client_embeddings.json` and large datasets.
 * 2. Load the quantized transformer model for feature extraction to reduce
 *    memory usage.
 * 3. For each file:
 *    - If markdown, group the text into sections from one heading to the next
 *      heading of the same or higher level.
 *      * Split any section longer than CHUNK_SIZE using OVERLAP for context.
 *    - If JSON, parse the contents.
 *      * When the root is an array, embed each item individually.
 *      * When the root is an object, flatten nested fields and embed each
 *        key/value pair.
 *    - If JS, parse the AST.
 *      * For source files, emit one chunk per exported function or class.
 *      * For test files, emit one chunk per `it` test case including describe
 *        context.
 * 4. Encode each chunk or entry using mean pooling and round the values.
 * 5. Build output objects with id, text, embedding, source, tags, and version.
 *    - Include an optional `qaContext` field containing a short summary when
 *      one can be derived from the text.
 *    - Tags include both a broad category ("prd", "data", or "code") and more
 *      specific labels such as "judoka-data" or "tooltip".
 *    - Append a simple intent tag ("why", "how", or "what") based on text
 *      analysis.
 * 6. Stream each output object directly to `client_embeddings.json` using
 *    `fs.createWriteStream`.
 *    - Track bytes written and abort if the total exceeds MAX_OUTPUT_SIZE (6.8 MB).
 * 7. After writing the file, record the total count, average vector length,
 *    and output size in `client_embeddings.meta.json`.
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import { pipeline } from "@xenova/transformers";
import * as acorn from "acorn";
import { walk } from "estree-walker";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Larger chunks reduce the total embedding count and help keep the
// final JSON under the 6.8MB limit. Bump slightly to shrink output.
const CHUNK_SIZE = 2000;
const OVERLAP = 100;
const MAX_OUTPUT_SIZE = 6.8 * 1024 * 1024;

/**
 * Recursively flatten a nested object using dot notation keys.
 *
 * @param {Record<string, any>} obj - Object to flatten.
 * @param {string} [prefix=""] - Current key prefix.
 * @returns {Record<string, any>} Flattened mapping.
 */
function flattenObject(obj, prefix = "") {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const id = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(acc, flattenObject(value, id));
    } else {
      acc[id] = value;
    }
    return acc;
  }, {});
}

function chunkMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const heading = /^(#{1,6})\s+/;
  const sections = [];
  let i = 0;

  while (i < lines.length && !heading.test(lines[i])) i++;
  if (i > 0) {
    const pre = lines.slice(0, i).join("\n").trim();
    if (pre) sections.push(pre);
  }

  for (let idx = i; idx < lines.length; idx++) {
    const match = heading.exec(lines[idx]);
    if (!match) continue;
    const level = match[1].length;
    let j = idx + 1;
    while (j < lines.length) {
      const next = heading.exec(lines[j]);
      if (next && next[1].length <= level) break;
      j++;
    }
    const section = lines.slice(idx, j).join("\n").trim();
    if (section) sections.push(section);
  }

  const chunks = [];
  for (const section of sections) {
    if (section.length > CHUNK_SIZE) {
      for (let start = 0; start < section.length; start += CHUNK_SIZE - OVERLAP) {
        chunks.push(section.slice(start, start + CHUNK_SIZE));
      }
    } else {
      chunks.push(section);
    }
  }

  return chunks;
}

/**
 * Chunk JavaScript source into logical units.
 *
 * @pseudocode
 * 1. Parse the source into an AST using acorn.
 * 2. When `isTest` is true:
 *    - Track nested `describe` titles while walking the tree.
 *    - Emit one chunk for each `it`/`test` call with its describe context.
 * 3. Otherwise:
 *    - Collect exported functions or classes and include any leading JSDoc.
 * 4. Return an array of `{id, text}` chunks ready for embedding.
 *
 * @param {string} source - JS file contents.
 * @param {boolean} isTest - Whether the file is a test file.
 * @returns {Array<{id:string,text:string}>} Code chunks.
 */
function chunkCode(source, isTest = false) {
  const comments = [];
  const ast = acorn.parse(source, {
    ecmaVersion: "latest",
    sourceType: "module",
    ranges: true,
    onComment: comments
  });
  const chunks = [];
  const importModules = new Set();

  for (const node of ast.body) {
    if (node.type === "ImportDeclaration") {
      importModules.add(node.source.value);
    }
  }

  function findJsDoc(start) {
    for (let i = comments.length - 1; i >= 0; i--) {
      const c = comments[i];
      if (c.end <= start && c.type === "Block" && c.value.startsWith("*")) {
        if (/^\s*$/.test(source.slice(c.end, start))) return c;
        break;
      }
    }
    return null;
  }

  function callName(node) {
    if (node.type === "Identifier") return node.name;
    if (node.type === "MemberExpression") return callName(node.property);
    return null;
  }

  function gatherReferences(node) {
    const refs = new Set();
    walk(node, {
      enter(n) {
        if (n.type === "CallExpression") {
          const nName = callName(n.callee);
          if (nName) refs.add(nName);
        }
      }
    });
    return Array.from(refs);
  }

  if (isTest) {
    const stack = [];
    walk(ast, {
      enter(node) {
        if (node.type === "CallExpression") {
          const name = callName(node.callee);
          if (name === "describe") {
            const title = node.arguments[0] && node.arguments[0].value;
            stack.push(title || "");
          } else if (name === "it" || name === "test") {
            const title = node.arguments[0] && node.arguments[0].value;
            const context = [...stack, title || ""].filter(Boolean).join(" > ");
            const [start, end] = node.range;
            const code = source.slice(start, end);
            const prefix = context ? `// ${context}\n` : "";
            chunks.push({
              id: context || `test-${chunks.length + 1}`,
              text: `${prefix}${code}`,
              construct: "test",
              references: gatherReferences(node)
            });
          }
        }
      },
      leave(node) {
        if (node.type === "CallExpression" && callName(node.callee) === "describe") {
          stack.pop();
        }
      }
    });
  } else {
    walk(ast, {
      enter(node) {
        if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") {
          const decl = node.declaration;
          if (!decl) return;
          const exports = [];
          if (decl.type === "FunctionDeclaration" || decl.type === "ClassDeclaration") {
            const construct = decl.type === "FunctionDeclaration" ? "function" : "class";
            exports.push({
              id: decl.id && decl.id.name,
              start: node.start,
              end: node.end,
              construct,
              node: decl
            });
          } else if (decl.type === "VariableDeclaration") {
            for (const d of decl.declarations) {
              const init = d.init;
              if (
                init &&
                (init.type === "FunctionExpression" ||
                  init.type === "ArrowFunctionExpression" ||
                  init.type === "ClassExpression")
              ) {
                exports.push({
                  id: d.id.name,
                  start: node.start,
                  end: node.end,
                  node: d,
                  construct: "variable"
                });
              }
            }
          }
          for (const ex of exports) {
            let start = ex.start;
            const doc = findJsDoc(start);
            if (doc) start = doc.start;
            const code = source.slice(start, ex.end);
            chunks.push({
              id: ex.id || "default",
              text: code,
              construct: ex.construct,
              references: gatherReferences(ex.node)
            });
          }
        }
      }
    });
  }

  return { chunks, imports: Array.from(importModules) };
}

function createQaContext(text) {
  if (typeof text !== "string") return undefined;
  const cleaned = text
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^#+\s*/, "")
    .trim();
  const match = cleaned.match(/[^.!?]+[.!?]/);
  if (!match) return undefined;
  let sentence = match[0].trim();
  if (sentence.length > 160) {
    sentence = sentence.slice(0, 157) + "...";
  }
  return sentence;
}

async function getFiles() {
  const prdFiles = await glob("design/productRequirementsDocuments/*.md", {
    cwd: rootDir
  });
  const guidelineFiles = await glob("design/codeStandards/*.md", { cwd: rootDir });
  const workflowFiles = await glob("design/agentWorkflows/*.md", { cwd: rootDir });
  const jsonFiles = (await glob("src/data/*.json", { cwd: rootDir })).filter(
    (f) =>
      path.extname(f) === ".json" &&
      ![
        "client_embeddings.json",
        "client_embeddings.meta.json",
        "aesopsFables.json",
        "aesopsMeta.json",
        "countryCodeMapping.json",
        "japaneseConverter.json"
      ].includes(path.basename(f))
  );
  const jsFiles = await glob("{src,tests,playwright}/**/*.js", {
    cwd: rootDir,
    ignore: ["**/node_modules/**"]
  });
  return [...prdFiles, ...guidelineFiles, ...workflowFiles, ...jsonFiles, ...jsFiles];
}

/**
 * Load the MiniLM feature extractor in quantized form.
 *
 * @returns {Promise<any>} Initialized pipeline instance.
 */
async function loadModel() {
  // Reduce memory footprint by loading the quantized model
  return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { quantized: true });
}

function determineTags(relativePath, ext, isTest) {
  if (ext === ".json") {
    const tags = ["data"];
    const file = path.basename(relativePath);
    if (file === "judoka.json") tags.push("judoka-data");
    else if (file === "tooltips.json") tags.push("tooltip");
    else tags.push("game-data");
    return tags;
  }
  if (ext === ".js") {
    return [isTest ? "test-code" : "code"];
  }
  const tags = ["prd"];
  if (relativePath.startsWith("design/productRequirementsDocuments")) {
    tags.push("design-doc");
  } else if (relativePath.startsWith("design/codeStandards")) {
    tags.push("design-guideline");
  } else if (relativePath.startsWith("design/agentWorkflows")) {
    tags.push("agent-workflow");
  }
  return tags;
}

/**
 * Classify the intent of a text snippet.
 *
 * @param {string} text - Text to analyze.
 * @returns {string} Intent category: "why", "how", or "what".
 */
function determineIntent(text) {
  const lower = text.toLowerCase();
  if (/(why|reason|because|goal|problem)/.test(lower)) return "why";
  if (/(how|step|workflow|process|flow)/.test(lower)) return "how";
  return "what";
}

function determineRole(relativePath) {
  if (
    /tests\//.test(relativePath) ||
    /playwright\//.test(relativePath) ||
    /\.test\.js$/.test(relativePath) ||
    /\.spec\.js$/.test(relativePath)
  ) {
    return "test";
  }
  if (/components\//.test(relativePath)) return "component";
  if (/config/.test(relativePath)) return "config";
  return "utility";
}

function buildMetadata(relativePath, chunkMeta = {}, imports = []) {
  return {
    construct: chunkMeta.construct,
    role: determineRole(relativePath),
    relations: {
      imports,
      references: chunkMeta.references || []
    }
  };
}

async function generate() {
  const files = await getFiles();
  const extractor = await loadModel();
  const outputPath = path.join(rootDir, "src/data/client_embeddings.json");
  const writer = createWriteStream(outputPath, { encoding: "utf8" });
  let bytesWritten = 0;
  let first = true;
  let entryCount = 0;
  let vectorLengthTotal = 0;

  writer.write("[");
  bytesWritten += Buffer.byteLength("[", "utf8");

  const writeEntry = (obj) => {
    const serialized = JSON.stringify(obj);
    const chunk = (first ? "\n" : ",\n") + serialized;
    const size = Buffer.byteLength(chunk + "\n]", "utf8");
    if (bytesWritten + size > MAX_OUTPUT_SIZE) {
      writer.end();
      throw new Error("Output exceeds 6.8MB");
    }
    writer.write(chunk);
    bytesWritten += Buffer.byteLength(chunk, "utf8");
    first = false;
    entryCount += 1;
    vectorLengthTotal += obj.embedding.length;
  };

  for (const relativePath of files) {
    const fullPath = path.join(rootDir, relativePath);
    const text = await readFile(fullPath, "utf8");
    const base = path.basename(relativePath);
    const ext = path.extname(relativePath);
    const isJson = ext === ".json";
    const isMarkdown = ext === ".md";
    const isJs = ext === ".js";
    const isTest =
      isJs &&
      (/\.test\.js$/.test(base) ||
        /\.spec\.js$/.test(base) ||
        relativePath.includes("/tests/") ||
        relativePath.includes("/playwright/"));
    const baseTags = determineTags(relativePath, ext, isTest);

    if (isJson) {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        for (const [index, item] of json.entries()) {
          const chunkText = JSON.stringify(item);
          const intent = determineIntent(chunkText);
          const metadata = buildMetadata(relativePath);
          const tagSet = new Set(baseTags);
          tagSet.add(intent);
          tagSet.add(metadata.role);
          const tags = Array.from(tagSet);
          const result = await extractor(chunkText, { pooling: "mean" });
          const qa = createQaContext(chunkText);
          writeEntry({
            id: `${base}-${index + 1}`,
            text: chunkText,
            ...(qa ? { qaContext: qa } : {}),
            embedding: Array.from(result.data ?? result).map((v) => Number(v.toFixed(4))),
            source: `${relativePath} [${index}]`,
            tags,
            metadata,
            version: 1
          });
        }
      } else if (json && typeof json === "object") {
        const flat = flattenObject(json);
        for (const [key, value] of Object.entries(flat)) {
          const chunkText = typeof value === "string" ? value : JSON.stringify(value);
          const intent = determineIntent(chunkText);
          const metadata = buildMetadata(relativePath);
          const tagSet = new Set(baseTags);
          tagSet.add(intent);
          tagSet.add(metadata.role);
          const tags = Array.from(tagSet);
          const result = await extractor(chunkText, { pooling: "mean" });
          const qa = createQaContext(chunkText);
          writeEntry({
            id: `${base}-${key}`,
            text: chunkText,
            ...(qa ? { qaContext: qa } : {}),
            embedding: Array.from(result.data ?? result).map((v) => Number(v.toFixed(4))),
            source: `${relativePath} [${key}]`,
            tags,
            metadata,
            version: 1
          });
        }
      }
    } else if (isMarkdown) {
      const chunks = chunkMarkdown(text);
      for (const [index, chunkText] of chunks.entries()) {
        const intent = determineIntent(chunkText);
        const metadata = buildMetadata(relativePath);
        const tagSet = new Set(baseTags);
        tagSet.add(intent);
        tagSet.add(metadata.role);
        const tags = Array.from(tagSet);
        const result = await extractor(chunkText, { pooling: "mean" });
        const qa = createQaContext(chunkText);
        writeEntry({
          id: `${base}-chunk-${index + 1}`,
          text: chunkText,
          ...(qa ? { qaContext: qa } : {}),
          embedding: Array.from(result.data ?? result).map((v) => Number(v.toFixed(4))),
          source: `${relativePath} [chunk ${index + 1}]`,
          tags,
          metadata,
          version: 1
        });
      }
    } else if (isJs) {
      const { chunks, imports } = chunkCode(text, isTest);
      for (const [index, chunk] of chunks.entries()) {
        const chunkText = chunk.text;
        const idSuffix = chunk.id || `chunk-${index + 1}`;
        const intent = determineIntent(chunkText);
        const metadata = buildMetadata(relativePath, chunk, imports);
        const tagSet = new Set(baseTags);
        tagSet.add(intent);
        if (metadata.construct) tagSet.add(metadata.construct);
        tagSet.add(metadata.role);
        for (const mod of metadata.relations.imports) tagSet.add(mod);
        for (const ref of metadata.relations.references) tagSet.add(ref);
        const tags = Array.from(tagSet);
        const result = await extractor(chunkText, { pooling: "mean" });
        const qa = createQaContext(chunkText);
        writeEntry({
          id: `${base}-${idSuffix}`,
          text: chunkText,
          ...(qa ? { qaContext: qa } : {}),
          embedding: Array.from(result.data ?? result).map((v) => Number(v.toFixed(4))),
          source: `${relativePath} [${idSuffix}]`,
          tags,
          metadata,
          version: 1
        });
      }
    }
  }

  const endStr = "\n]\n";
  if (bytesWritten + Buffer.byteLength(endStr, "utf8") > MAX_OUTPUT_SIZE) {
    writer.end();
    throw new Error("Output exceeds 6.8MB");
  }
  writer.end(endStr);
  await new Promise((resolve) => writer.on("finish", resolve));
  const stats = await stat(outputPath);
  const avgLength = entryCount ? Number((vectorLengthTotal / entryCount).toFixed(2)) : 0;
  const meta = {
    count: entryCount,
    avgVectorLength: avgLength,
    fileSizeKB: Number((stats.size / 1024).toFixed(2))
  };
  await writeFile(
    path.join(rootDir, "src/data/client_embeddings.meta.json"),
    JSON.stringify(meta, null, 2)
  );
}

await generate();
