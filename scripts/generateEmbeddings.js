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
 *    - Track bytes written and abort if the total exceeds MAX_OUTPUT_SIZE (9.8 MB).
 * 7. After writing the file, record the total count, average vector length,
 *    and output size in `client_embeddings.meta.json`.
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { glob } from "glob";
import * as acorn from "acorn";
import { walk } from "estree-walker";
import { CHUNK_SIZE, OVERLAP_RATIO } from "../src/helpers/vectorSearch/chunkConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const nodeRequire = createRequire(import.meta.url);

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "in",
  "on",
  "at",
  "for",
  "to",
  "of",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "but",
  "if",
  "not",
  "it",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "he",
  "his",
  "she",
  "her",
  "they",
  "their",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "a",
  "an",
  "the",
  "and",
  "but",
  "if",
  "or",
  "because",
  "as",
  "until",
  "while",
  "of",
  "at",
  "by",
  "for",
  "with",
  "about",
  "against",
  "between",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "to",
  "from",
  "up",
  "down",
  "in",
  "out",
  "on",
  "off",
  "over",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "s",
  "t",
  "can",
  "will",
  "just",
  "don",
  "should",
  "now"
]);

function createSparseVector(text) {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/);
  const termFrequencies = {};
  for (const token of tokens) {
    if (!STOP_WORDS.has(token)) {
      termFrequencies[token] = (termFrequencies[token] || 0) + 1;
    }
  }
  return termFrequencies;
}

let codeGraphs = { modules: {} };

const MAX_OUTPUT_SIZE = 9.8 * 1024 * 1024;

const JSON_FIELD_ALLOWLIST = {
  "battleRounds.json": ["label", "description", "category"],
  "codeGraphs.json": false,
  "countryCodeMapping.json": false,
  "offline_rag_metadata.json": false,
  "gameModes.json": ["name", "japaneseName", "description", "rules"],
  "gameTimers.json": ["description", "category"],
  "gokyo.json": ["name", "japanese", "description", "style", "category", "subCategory"],
  "japaneseConverter.json": false,
  "judoka.json": [
    "firstname",
    "surname",
    "country",
    "weightClass",
    "category",
    "bio",
    "rarity",
    "stats"
  ],
  "locations.json": ["name", "japaneseName", "description"],
  "navigationItems.json": ["url", "category"],
  "settings.json": ["displayMode", "aiDifficulty"],
  "statNames.json": ["name", "japanese", "description", "category"],
  "svgCodes.json": ["name", "category"],
  "synonyms.json": true,
  "tooltips.json": true, // Allow all fields
  "weightCategories.json": ["gender", "description", "categories.descriptor"],
  default: ["name", "description", "label"]
};

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

const BOILERPLATE_STRINGS = new Set(["lorem ipsum", "todo", "tbd"]);

/**
 * Normalize text by lowercasing and collapsing whitespace.
 *
 * @param {string} text - Text to normalize.
 * @returns {string} Normalized text.
 */
function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Return normalized text when unique and not boilerplate.
 *
 * @param {string} text - Raw text to evaluate.
 * @param {Set<string>} seen - Set tracking previously used text.
 * @returns {string|undefined} Normalized text or undefined when skipped.
 */
function normalizeAndFilter(text, seen) {
  const normalized = normalizeText(text);
  if (!normalized || BOILERPLATE_STRINGS.has(normalized) || seen.has(normalized)) {
    return undefined;
  }
  seen.add(normalized);
  return normalized;
}

/**
 * Extract allowlisted values from a JSON item.
 *
 * @param {string} base - Filename base of the JSON source.
 * @param {any} item - JSON value to process.
 * @returns {string|undefined} Space-joined values or undefined when none.
 */
function extractAllowedValues(base, item) {
  const allowlist =
    Object.hasOwn(JSON_FIELD_ALLOWLIST, base) && JSON_FIELD_ALLOWLIST[base] !== undefined
      ? JSON_FIELD_ALLOWLIST[base]
      : JSON_FIELD_ALLOWLIST.default;
  if (allowlist === false) return undefined;
  if (Array.isArray(item)) {
    return item.join(" ");
  }
  if (typeof item === "object" && item !== null) {
    const values = [];
    const flat = flattenObject(item);
    for (const [key, value] of Object.entries(flat)) {
      if (allowlist === true || allowlist.some((allowedKey) => key.startsWith(allowedKey))) {
        values.push(value);
      }
    }
    return values.length ? values.join(" ") : undefined;
  }
  return String(item);
}

function chunkMarkdown(text) {
  // Split by headings first to maintain logical sections
  const sections = text.split(/\n(?=#{1,6} )/);
  const finalChunks = [];

  for (const section of sections) {
    if (section.length <= CHUNK_SIZE) {
      finalChunks.push(section);
      continue;
    }

    // Sentence-aware splitting for oversized sections
    const sentences = section.match(/[^.!?]+[.!?]*\s*/g) || [];
    let currentChunk = "";
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > CHUNK_SIZE) {
        finalChunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk) {
      finalChunks.push(currentChunk.trim());
    }
  }

  // Post-process to handle overlaps
  const overlappedChunks = [];
  for (let i = 0; i < finalChunks.length; i++) {
    if (i > 0) {
      const previous = finalChunks[i - 1].split(" ");
      const overlap = previous.slice(-Math.floor(previous.length * OVERLAP_RATIO)).join(" ");
      overlappedChunks.push(overlap + " " + finalChunks[i]);
    } else {
      overlappedChunks.push(finalChunks[i]);
    }
  }

  return overlappedChunks;
}

/**
 * Chunk JavaScript/TypeScript source into logical units.
 *
 * @pseudocode
 * 1. Parse the source into an AST using acorn.
 * 2. When `isTest` is true:
 *    - Track nested `describe` titles while walking the tree.
 *    - Emit one chunk for each `it`/`test` call with its describe context.
 * 3. Otherwise:
 *    - Collect exported functions or classes.
 *    - Capture leading JSDoc and any `@pseudocode` lines for each export.
 * 4. Return an array of `{id, code, jsDoc, pseudocode}` chunks ready for
 *    embedding.
 *
 * @param {string} source - JS/TS file contents.
 * @param {boolean} isTest - Whether the file is a test file.
 * @returns {{chunks:Array<{id:string,code:string,jsDoc?:string,pseudocode?:string,construct?:string,references?:string[]}>,imports:string[]}}
 *   Code chunks and detected imports.
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

  function parseDoc(c) {
    if (!c) return {};
    const lines = c.value.split(/\r?\n/).map((l) => l.replace(/^\s*\*? ?/, ""));
    let jsDocLines = [];
    let pseudoLines = [];
    let inPseudo = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("@pseudocode")) {
        inPseudo = true;
        continue;
      }
      if (inPseudo) {
        if (/^@\w+/.test(trimmed)) {
          inPseudo = false;
        } else {
          pseudoLines.push(line);
          continue;
        }
      }
      jsDocLines.push(line);
    }
    const jsDoc = jsDocLines.join("\n").trim() || undefined;
    const pseudocode = pseudoLines.join("\n").trim() || undefined;
    return { jsDoc, pseudocode };
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
            const { jsDoc, pseudocode } = parseDoc(doc);
            if (doc) start = doc.end;
            const code = source.slice(start, ex.end);
            chunks.push({
              id: ex.id || "default",
              code,
              jsDoc,
              pseudocode,
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
  const sentences = cleaned.match(/[^.!?]+[.!?]/g);
  if (!sentences || sentences.length === 0) return undefined;
  const whySentence =
    sentences.find((s) => /(why|reason|because|goal|problem|purpose)/i.test(s)) || sentences[0];
  const howSentence =
    sentences.find(
      (s) => s !== whySentence && /(how|using|through|via|step|process|by\s|approach)/i.test(s)
    ) ||
    sentences[whySentence === sentences[0] && sentences[1] ? 1 : 0] ||
    sentences[0];
  let summary = `Why: ${whySentence.trim()} How: ${howSentence.trim()}`;
  if (summary.length > 200) {
    summary = summary.slice(0, 197) + "...";
  }
  return summary;
}

/**
 * Gather files to embed from markdown, data, and source directories.
 *
 * @pseudocode
 * 1. Collect all markdown under `design/` and every `README.md`.
 * 2. Add top-level overview markdown like `CONTRIBUTING.md` and `MIGRATION.md`.
 * 3. Include game data JSON files, excluding large generated files.
 * 4. Add `.js` and `.ts` sources from `src/` and `tests/` while skipping
 *    `node_modules`.
 * 5. Deduplicate and return the combined list.
 *
 * @returns {Promise<string[]>} Paths relative to the repo root.
 */
async function getFiles() {
  const designDocs = await glob("design/**/*.md", { cwd: rootDir });
  const readmes = await glob("**/README.md", {
    cwd: rootDir,
    ignore: ["**/node_modules/**"]
  });
  const overviewDocs = await glob("*.md", { cwd: rootDir });
  const jsonFiles = (await glob("src/data/*.json", { cwd: rootDir }))
    .filter((f) => path.extname(f) === ".json")
    .filter((f) => {
      const base = path.basename(f);
      // Exclude generated embedding outputs and shards from ingestion
      if (base.startsWith("client_embeddings.")) return false;
      // Exclude large or auxiliary datasets
      return ![
        "aesopsFables.json",
        "aesopsMeta.json",
        "countryCodeMapping.json",
        "japaneseConverter.json"
      ].includes(base);
    });
  const jsFiles = await glob(["src/**/*.{js,ts}", "tests/**/*.{js,ts}"], {
    cwd: rootDir,
    ignore: ["**/node_modules/**"]
  });
  return Array.from(
    new Set([...designDocs, ...readmes, ...overviewDocs, ...jsonFiles, ...jsFiles])
  );
}

/**
 * Load the MiniLM feature extractor in quantized form.
 *
 * @pseudocode
 * if running in Node:
 *   import pipeline and env
 *   enable local model loading
 *   try to resolve ONNX worker and wasm directory
 *     set wasm paths (with trailing separator) and worker script
 *   catch resolution failure
 *     use default worker and wasm paths
 *   disable ONNX proxy and load quantized model from local disk
 * else:
 *   load quantized model from remote source
 *
 * @returns {Promise<any>} Initialized pipeline instance.
 */
async function loadModel() {
  // Reduce memory footprint by loading the quantized model
  if (typeof process !== "undefined" && process.versions?.node) {
    const { pipeline, env } = await import("@xenova/transformers");
    env.allowLocalModels = true;
    env.localModelPath = rootDir;
    try {
      const workerPath = nodeRequire.resolve(
        "onnxruntime-web/dist/ort-wasm-simd-threaded.worker.js"
      );
      await stat(workerPath);
      const ortDir = path.dirname(workerPath);
      env.backends.onnx.wasm.wasmPaths = ortDir + path.sep;
      env.backends.onnx.wasm.worker = workerPath;
    } catch {
      // Worker script not found: ONNX backend will use its default worker and WASM paths.
      // No custom worker or path is set; library defaults are used.
    }
    env.backends.onnx.wasm.proxy = false;
    const modelDir = path.join("models", "minilm");
    return pipeline("feature-extraction", modelDir, { quantized: true });
  }
  const { pipeline } = await import("@xenova/transformers");
  return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    quantized: true
  });
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
  if (ext === ".js" || ext === ".ts") {
    return [isTest ? "test-code" : "code"];
  }
  const tags = ["prd"];
  if (relativePath.startsWith("design/productRequirementsDocuments")) {
    tags.push("design-doc");
  } else if (relativePath.startsWith("design/codeStandards")) {
    tags.push("design-guideline");
  } else if (relativePath.startsWith("design/agentWorkflows")) {
    tags.push("agent-workflow");
  } else if (relativePath.startsWith("design/architecture")) {
    tags.push("architecture-doc");
  } else if (/^(README|CONTRIBUTING|MIGRATION)\.md$/.test(path.basename(relativePath))) {
    tags.push("overview-doc");
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

function detectCrossCutting(text) {
  const lower = text.toLowerCase();
  const tags = [];
  if (/\b(log|logger|console|debug)\b/.test(lower)) tags.push("logging");
  if (/(state|store|reducer|context)/.test(lower)) tags.push("state-management");
  return tags;
}

function determineRole(relativePath) {
  if (
    /tests\//.test(relativePath) ||
    /\.test\.[jt]s$/.test(relativePath) ||
    /\.spec\.[jt]s$/.test(relativePath)
  ) {
    return "test";
  }
  if (/components\//.test(relativePath)) return "component";
  if (/config/.test(relativePath)) return "config";
  return "utility";
}

/**
 * Build embedding metadata linking to graph nodes and relations.
 *
 * @pseudocode
 * 1. Locate the module and function in the precomputed `codeGraphs` map.
 * 2. Use graph data to collect import and call relations along with pattern tags.
 * 3. Return metadata containing construct, role, graph node ids, patterns,
 *    and relation arrays for tagging.
 *
 * @param {string} relativePath - File path relative to the repo root.
 * @param {object} [chunkMeta] - Details about the current code chunk.
 * @param {Array<string>} [imports] - Fallback import list.
 * @returns {{construct?:string,role:string,graph?:object,patterns:string[],relations:{imports:string[],calls:string[]}}}
 */
function buildMetadata(relativePath, chunkMeta = {}, imports = []) {
  const moduleGraph = codeGraphs.modules?.[relativePath] || {};
  const functionGraph = chunkMeta.id ? moduleGraph.functions?.[chunkMeta.id] || {} : {};
  const relations = {
    imports: moduleGraph.imports || imports,
    calls: functionGraph.calls || chunkMeta.references || []
  };
  const graph = chunkMeta.id ? { module: relativePath, node: chunkMeta.id } : undefined;
  return {
    construct: chunkMeta.construct,
    role: determineRole(relativePath),
    graph,
    patterns: functionGraph.patterns || [],
    relations
  };
}

async function generate() {
  try {
    const graphPath = path.join(rootDir, "src/data/codeGraphs.json");
    codeGraphs = JSON.parse(await readFile(graphPath, "utf8"));
  } catch {
    codeGraphs = { modules: {} };
  }

  const files = await getFiles();
  const extractor = await loadModel();
  const outputPath = path.join(rootDir, "src/data/client_embeddings.json");
  const writer = createWriteStream(outputPath, { encoding: "utf8" });
  let bytesWritten = 0;
  let first = true;
  let entryCount = 0;
  let vectorLengthTotal = 0;
  const seenTexts = new Set();

  writer.write("[");
  bytesWritten += Buffer.byteLength("[", "utf8");

  const writeEntry = (obj) => {
    const serialized = JSON.stringify(obj);
    const chunk = (first ? "\n" : ",\n") + serialized;
    const size = Buffer.byteLength(chunk + "\n]", "utf8");
    if (bytesWritten + size > MAX_OUTPUT_SIZE) {
      writer.end();
      throw new Error("Output exceeds 9.8MB");
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
    const isJs = ext === ".js" || ext === ".ts";
    const isTest =
      isJs &&
      (/\.test\.[jt]s$/.test(base) ||
        /\.spec\.[jt]s$/.test(base) ||
        relativePath.includes("/tests/"));
    const baseTags = determineTags(relativePath, ext, isTest);

    if (isJson) {
      const json = JSON.parse(text);
      const processItem = async (item, id) => {
        const textToEmbed = extractAllowedValues(base, item);
        const chunkText = textToEmbed
          ? normalizeAndFilter(String(textToEmbed), seenTexts)
          : undefined;
        if (!chunkText) return;
        const intent = determineIntent(chunkText);
        const metadata = buildMetadata(relativePath);
        const tagSet = new Set(baseTags);
        tagSet.add(intent);
        tagSet.add(metadata.role);
        for (const mod of metadata.relations.imports) tagSet.add(mod);
        for (const call of metadata.relations.calls) tagSet.add(call);
        for (const pat of metadata.patterns) tagSet.add(pat);
        for (const cc of detectCrossCutting(chunkText)) tagSet.add(cc);
        const tags = Array.from(tagSet);
        const result = await extractor(chunkText, { pooling: "mean" });
        const qa = createQaContext(chunkText);
        const sparseVector = createSparseVector(chunkText);
        writeEntry({
          id: `${base}-${id}`,
          text: chunkText,
          ...(qa ? { qaContext: qa } : {}),
          embedding: Array.from(result.data ?? result).map((v) => Number(v.toFixed(3))),
          sparseVector,
          source: `${relativePath} [${id}]`,
          tags,
          metadata,
          version: 1
        });
      };

      if (Array.isArray(json)) {
        for (const [index, item] of json.entries()) {
          await processItem(item, index + 1);
        }
      } else if (json && typeof json === "object") {
        for (const [key, value] of Object.entries(json)) {
          await processItem(value, key);
        }
      }
    } else if (isMarkdown) {
      const chunks = chunkMarkdown(text);
      for (const [index, rawChunk] of chunks.entries()) {
        const chunkText = normalizeAndFilter(rawChunk, seenTexts);
        if (!chunkText) continue;
        const intent = determineIntent(chunkText);
        const metadata = buildMetadata(relativePath);
        const tagSet = new Set(baseTags);
        tagSet.add(intent);
        tagSet.add(metadata.role);
        for (const mod of metadata.relations.imports) tagSet.add(mod);
        for (const call of metadata.relations.calls) tagSet.add(call);
        for (const pat of metadata.patterns) tagSet.add(pat);
        for (const cc of detectCrossCutting(chunkText)) tagSet.add(cc);
        const tags = Array.from(tagSet);
        const result = await extractor(chunkText, { pooling: "mean" });
        const qa = createQaContext(chunkText);
        const sparseVector = createSparseVector(chunkText);
        writeEntry({
          id: `${base}-chunk-${index + 1}`,
          text: chunkText,
          ...(qa ? { qaContext: qa } : {}),
          embedding: Array.from(result.data ?? result).map((v) => Number(v.toFixed(3))),
          sparseVector,
          source: `${relativePath} [chunk ${index + 1}]`,
          tags,
          metadata,
          version: 1
        });
      }
    } else if (isJs) {
      const { chunks, imports } = chunkCode(text, isTest);
      for (const [index, chunk] of chunks.entries()) {
        const rawChunk = [chunk.jsDoc, chunk.pseudocode, chunk.code].filter(Boolean).join("\n");
        const chunkText = normalizeAndFilter(rawChunk, seenTexts);
        if (!chunkText) continue;
        const idSuffix = chunk.id || `chunk-${index + 1}`;
        const intent = determineIntent(chunkText);
        const metadata = buildMetadata(relativePath, chunk, imports);
        const tagSet = new Set(baseTags);
        tagSet.add(intent);
        if (metadata.construct) tagSet.add(metadata.construct);
        tagSet.add(metadata.role);
        for (const mod of metadata.relations.imports) tagSet.add(mod);
        for (const call of metadata.relations.calls) tagSet.add(call);
        for (const pat of metadata.patterns) tagSet.add(pat);
        for (const cc of detectCrossCutting(chunkText)) tagSet.add(cc);
        const tags = Array.from(tagSet);
        const result = await extractor(chunkText, { pooling: "mean" });
        const qa = createQaContext(chunkText);
        const sparseVector = createSparseVector(chunkText);
        writeEntry({
          id: `${base}-${idSuffix}`,
          text: chunkText,
          ...(qa ? { qaContext: qa } : {}),
          embedding: Array.from(result.data ?? result).map((v) => Number(v.toFixed(3))),
          sparseVector,
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

export {
  JSON_FIELD_ALLOWLIST,
  flattenObject,
  BOILERPLATE_STRINGS,
  normalizeText,
  normalizeAndFilter,
  extractAllowedValues,
  createSparseVector
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await generate();
}
