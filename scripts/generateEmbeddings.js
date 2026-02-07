/* eslint-env node */
/**
 * Generate embeddings for PRD markdown, JSON data, and JS source files.
 *
 * **OUTPUT STRUCTURE**: Generates `src/data/client_embeddings.json` as a **ROOT-LEVEL JSON ARRAY**
 * (NOT an object with an "embeddings" property). The root must always be `[{...}, {...}, ...]`.
 * See `src/data/schemas/client-embeddings.schema.json` for the full schema.
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
 * 6. Stream each output object directly to `client_embeddings.json` as a JSON array.
 *    Each entry is streamed sequentially: [entry1, entry2, entry3, ...]
 *    - Track bytes written and abort if the total exceeds MAX_OUTPUT_SIZE (38.8 MB).
 *    - The root structure is always an array, maintained throughout the stream.
 * 7. After writing the file, record the total count, average vector length,
 *    and output size in `client_embeddings.meta.json`.
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { glob } from "glob";
import * as acorn from "acorn";
import { walk } from "estree-walker";
import { deriveContextPath } from "./generation/contextPathHelper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const nodeRequire = createRequire(import.meta.url);

const CHUNK_SIZE = 1400;
const OVERLAP_RATIO = 0.15;
const CURRENT_EMBEDDING_VERSION = 1;
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

const MAX_OUTPUT_SIZE = 38.8 * 1024 * 1024;

const DATA_FIELD_ALLOWLIST = {
  "battleRounds.js": ["label", "description", "category"],
  "codeGraphs.json": false,
  "countryCodeMapping.json": false,
  "offline_rag_metadata.json": false,
  "gameModes.json": ["name", "japaneseName", "description", "rules"],
  "gameTimers.js": ["description", "category", "name", "duration", "isTransition"],
  "gokyo.json": ["name", "japanese", "description", "style", "category", "subCategory"],
  "japaneseConverter.js": false,
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
  "navigationItems.js": [
    "url",
    "category",
    "label",
    "name",
    "title",
    "order",
    "isHidden",
    "gameModeId"
  ],
  "statNames.js": ["name", "japanese", "description", "category", "power", "speed", "technique"],
  "settings.json": [
    "sound",
    "motionEffects",
    "typewriterEffect",
    "tooltips",
    "showCardOfTheDay",
    "displayMode",
    "fullNavigationMap",
    "aiDifficulty",
    "tooltipIds",
    "featureFlags"
  ],
  "svgCodes.json": ["name", "category"],
  "synonyms.json": true,
  "tooltips.json": true, // Allow all fields
  "weightCategories.json": ["gender", "description", "categories"],
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

// Back-compat alias for tests expecting this export name
const JSON_FIELD_ALLOWLIST = DATA_FIELD_ALLOWLIST;

/**
 * Convert a value to a string representation, handling arrays and objects recursively.
 *
 * @pseudocode
 * 1. If value is undefined or null, return undefined.
 * 2. If value is an array, recursively stringify items, remove undefined results, and join with ", ".
 * 3. If value is an object, recursively stringify each property, remove undefined results, and join with ", ".
 * 4. Otherwise, coerce the value to string, trim whitespace, and return the string when non-empty.
 *
 * @param {any} value - The value to stringify.
 * @returns {string|undefined} String representation or undefined for empty/null values.
 */
function stringifyAllowedValue(value) {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    const items = value
      .map((item) => stringifyAllowedValue(item))
      .filter((item) => item !== undefined);
    return items.length ? items.join(", ") : undefined;
  }
  if (typeof value === "object") {
    const items = Object.values(value)
      .map((item) => stringifyAllowedValue(item))
      .filter((item) => item !== undefined);
    return items.length ? items.join(", ") : undefined;
  }
  const text = String(value).trim();
  return text ? text : undefined;
}

/**
 * Check if a key matches an allowlisted field pattern.
 *
 * @pseudocode
 * 1. Compare the key directly to the allowlisted field.
 * 2. If not equal, check whether the key starts with the field followed by a dot for nested properties.
 * 3. Return true when either condition passes.
 *
 * @param {string} key - The key to check.
 * @param {string} field - The allowlisted field pattern.
 * @returns {boolean} True if key matches the field or is a nested property of it.
 */
function matchesAllowlistedKey(key, field) {
  return key === field || key.startsWith(`${field}.`);
}

/**
 * Extract allowlisted values from a data item based on configured field allowlists.
 *
 * @pseudocode
 * 1. Look up the allowlist for the file base; return undefined when explicitly disabled.
 * 2. When allowlist is true, flatten objects (if needed) and join all values.
 * 3. When allowlist is an array, flatten the item, retain keys that match configured fields, and join results.
 * 4. For other allowlist values, return undefined to preserve fallback semantics.
 *
 * @param {string} base - Base filename for allowlist lookup.
 * @param {any} item - Data item to extract values from.
 * @returns {string|undefined} Formatted string of allowed values or undefined if none.
 */
function extractAllowedValues(base, item) {
  const allowlist = JSON_FIELD_ALLOWLIST[base] ?? JSON_FIELD_ALLOWLIST.default;
  if (allowlist === false) return undefined;
  if (allowlist === true) {
    if (item && typeof item === "object") {
      const flattened = flattenObject(item);
      const values = Object.values(flattened)
        .map((value) => stringifyAllowedValue(value))
        .filter((value) => value !== undefined);
      return values.length ? values.join(". ") : undefined;
    }
    const text = stringifyAllowedValue(item);
    return text;
  }

  if (!Array.isArray(allowlist) || allowlist.length === 0) {
    return undefined;
  }

  const flattened = item && typeof item === "object" ? flattenObject(item) : { value: item };
  const values = [];
  for (const [key, value] of Object.entries(flattened)) {
    if (!allowlist.some((field) => matchesAllowlistedKey(key, field))) continue;
    const text = stringifyAllowedValue(value);
    if (text) values.push(text);
  }
  if (values.length === 0) return undefined;
  return values.join(". ");
}

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
 * Extract allowlisted values from a data item.
 *
 * @param {string} base - Filename base of the data source.
 * @param {any} item - Data value to process.
 * @returns {string|undefined} Space-joined values or undefined when none.
 */
function formatDataEntry(base, item) {
  if (base === "judoka.json") {
    const judoka = item;
    const stats = Object.entries(judoka.stats)
      .map(([key, value]) => `${key} ${value}`)
      .join(", ");
    return `Judoka: ${judoka.firstname} ${judoka.surname}. Country: ${judoka.country}. Rarity: ${judoka.rarity}. Stats: ${stats}. Bio: ${judoka.bio}`;
  }

  if (base === "gameTimers.js") {
    const timer = item;
    return `Game Timer: ${timer.description}. Category: ${timer.category}, Duration: ${timer.value}s, Skill level: ${timer.skill}.`;
  }

  if (base === "tooltips.json") {
    // tooltips.json has a different structure, it's an object of key-value pairs
    // I will handle it in processJsonObjectEntries
    return null;
  }

  if (base === "navigationItems.js") {
    const navItem = item;
    return `Navigation Item: ${navItem.label}. URL: ${navItem.url}. Category: ${navItem.category}.`;
  }

  if (base === "statNames.js") {
    const stat = item;
    return `Stat: ${stat.name}. Description: ${stat.description}.`;
  }

  if (base === "gameModes.json") {
    const mode = item;
    return `Game Mode: ${mode.name}. Description: ${mode.description}. Rules: ${mode.rules}`;
  }

  // Default fallback for other data files
  if (typeof item === "object" && item !== null) {
    return Object.entries(item)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" ");
  }

  return String(item);
}

function collectKeyPaths(obj, prefix = "", out = []) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object") collectKeyPaths(v, p, out);
      else out.push([p, String(v)]);
    }
  }
  return out;
}

/**
 * Create a processor function that writes embedding entries for JSON data.
 *
 * @pseudocode
 * 1. Accept base metadata (file name, path, tags) plus extractor/write helpers.
 * 2. When invoked, favor `overrideText`; otherwise compute formatted text.
 * 3. Normalize, tag, embed, and stream the entry while avoiding duplicates.
 *
 * @param {object} options - Dependencies for the processor.
 * @param {string} options.base - Base filename used for entry ids.
 * @param {string} options.relativePath - Source path for metadata.
 * @param {Array<string>} options.baseTags - Initial tag list for the entry.
 * @param {(text:string, opts:object)=>Promise<any>} options.extractor - Embedding extractor.
 * @param {(entry:object)=>void} options.writeEntry - Writer that persists entries.
 * @param {Set<string>} options.seenTexts - Tracker preventing duplicate chunks.
 * @param {(base:string, item:any)=>string|undefined} [options.extractAllowedValuesFn]
 *   - Function to derive formatted text when no override is provided.
 * @returns {(item:any, id:string, overrideText?:string)=>Promise<void>} Async processor for a JSON entry.
 */
function createJsonProcessItem({
  base,
  relativePath,
  baseTags,
  extractor,
  writeEntry,
  seenTexts,
  extractAllowedValuesFn = formatDataEntry
}) {
  const allowlistFn = extractAllowedValuesFn || formatDataEntry;
  return async (item, id, overrideText) => {
    const overrideCandidate = typeof overrideText === "string" ? overrideText.trim() : overrideText;
    const extracted =
      overrideCandidate === undefined || overrideCandidate === null || overrideCandidate === ""
        ? allowlistFn(base, item)
        : overrideCandidate;
    const textToEmbed =
      extracted === undefined || extracted === null ? undefined : String(extracted);
    const chunkText = textToEmbed ? normalizeAndFilter(String(textToEmbed), seenTexts) : undefined;
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
      contextPath: deriveContextPath({ source: `${relativePath} [${id}]`, tags }),
      tags,
      metadata,
      version: CURRENT_EMBEDDING_VERSION
    });
  };
}

/**
 * Process each element in a JSON array using the provided processor.
 *
 * @pseudocode
 * 1. Iterate entries with their index.
 * 2. Format each item into a natural language string.
 * 3. Skip entries without formatted content; otherwise call the processor.
 *
 * @param {Array<any>} items - JSON array to process.
 * @param {object} options - Processing context.
 * @param {string} options.baseName - Base filename for allowlist lookup.
 * @param {Function} options.processItem - Processor created via `createJsonProcessItem`.
 * @param {(base:string, item:any)=>string|undefined} [options.extractAllowedValuesFn]
 *   - Optional allowlist extractor override.
 * @returns {Promise<void>} Resolves when all entries are processed.
 */
async function processJsonArrayEntries(
  items,
  { baseName, processItem, extractAllowedValuesFn = formatDataEntry }
) {
  const allowlistFn = extractAllowedValuesFn || formatDataEntry;
  for (const [index, item] of items.entries()) {
    const formattedText = allowlistFn(baseName, item);
    if (!formattedText) continue;
    await processItem(item, `item-${index + 1}`, formattedText);
  }
}

/**
 * Process object key-path pairs using the provided processor.
 *
 * @pseudocode
 * 1. Flatten the object into key-path/value tuples.
 * 2. For each tuple, format it into a natural language string.
 * 3. Skip tuples without formatted content; otherwise invoke the processor
 *    with the original key-path structure and override text.
 *
 * @param {object} obj - Root object to flatten and process.
 * @param {object} options - Processing context.
 * @param {string} options.baseName - Base filename for allowlist lookup.
 * @param {Function} options.processItem - Processor created via `createJsonProcessItem`.
 * @param {(base:string, item:any)=>string|undefined} [options.extractAllowedValuesFn]
 *   - Optional allowlist extractor override.
 * @returns {Promise<void>} Resolves when all key paths are processed.
 */
async function processJsonObjectEntries(
  obj,
  { baseName, processItem, extractAllowedValuesFn = formatDataEntry }
) {
  const allowlistFn = extractAllowedValuesFn || formatDataEntry;
  if (baseName === "tooltips.json") {
    /**
     * Recursively process tooltip entries, handling nested objects and arrays.
     *
     * @param {any} value - The tooltip value to process.
     * @param {string[]} pathSegments - Array of path segments to build the key.
     */
    const visitTooltipEntry = async (value, pathSegments) => {
      if (value === undefined || value === null) return;
      const key = pathSegments.join(".");

      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        const textBody = String(value).trim();
        if (!textBody) return;
        await processItem({ [key]: value }, key, `Tooltip ${key}: ${textBody}`);
        return;
      }

      if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index += 1) {
          await visitTooltipEntry(value[index], [...pathSegments, `[${index}]`]);
        }
        return;
      }

      if (typeof value === "object") {
        const label = typeof value.label === "string" ? value.label.trim() : "";
        const description = typeof value.description === "string" ? value.description.trim() : "";
        if (label || description) {
          const summaryParts = [];
          if (label) summaryParts.push(label);
          if (description) summaryParts.push(description);
          await processItem({ [key]: value }, key, `Tooltip ${key}: ${summaryParts.join(" — ")}`);
        }

        for (const [childKey, childValue] of Object.entries(value)) {
          // Skip label and description fields if they were already processed as summary
          if ((childKey === "label" && label) || (childKey === "description" && description)) {
            continue;
          }
          await visitTooltipEntry(childValue, [...pathSegments, childKey]);
        }
      }
    };

    for (const [topKey, topValue] of Object.entries(obj)) {
      await visitTooltipEntry(topValue, [topKey]);
    }
    return;
  }

  const flat = collectKeyPaths(obj);
  for (const [keyPath, value] of flat) {
    const allowed = allowlistFn(baseName, { [keyPath]: value });
    if (allowed === undefined || allowed === null) continue;
    let formattedText = String(allowed).trim();
    if (!formattedText) continue;

    if (formattedText.startsWith(`${keyPath}:`)) {
      const suffix = formattedText.slice(keyPath.length + 1).trimStart();
      formattedText = `${keyPath}: ${suffix}`;
    } else {
      formattedText = `${keyPath}: ${formattedText}`;
    }

    await processItem({ [keyPath]: value }, keyPath, formattedText);
  }
}

function chunkMarkdown(text) {
  // Split by headings first to maintain logical sections
  const sections = text.split(/\n(?=#{1,6} )/);
  const finalChunks = [];

  for (const section of sections) {
    const paragraphs = section.split(/\n\n+/);
    for (const para of paragraphs) {
      if (para.length <= CHUNK_SIZE) {
        finalChunks.push(para);
      } else {
        // If a paragraph is too long, split it by sentences
        const sentences = para.match(/[^.!?]+[.!?]*\s*/g) || [];
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
  let firstImportStart = Infinity;
  let firstExportStart = Infinity;

  for (const node of ast.body) {
    if (node.type === "ImportDeclaration") {
      importModules.add(node.source.value);
      if (node.start < firstImportStart) firstImportStart = node.start;
    }
    if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") {
      if (node.start < firstExportStart) firstExportStart = node.start;
    }
  }

  const firstCodeStart = Math.min(firstImportStart, firstExportStart);

  let moduleDocComment = null;
  let attachModuleDocToExport = false;
  if (!isTest && firstCodeStart !== Infinity) {
    for (const comment of comments) {
      if (
        comment.type === "Block" &&
        comment.value.startsWith("*") &&
        comment.end <= firstCodeStart
      ) {
        moduleDocComment = comment;
        break;
      }
    }
  }

  if (moduleDocComment && firstExportStart !== Infinity) {
    const hasOnlyImportsBetween = ast.body.every((node) => {
      if (node.start >= firstExportStart) return true;
      if (node.end <= moduleDocComment.end) return true;
      return node.type === "ImportDeclaration";
    });
    if (hasOnlyImportsBetween) {
      attachModuleDocToExport = true;
    }
  }
  const moduleDocInfo = moduleDocComment ? parseDoc(moduleDocComment) : {};
  let moduleDocUsed = false;

  function shouldIncludeModuleDoc() {
    if (moduleDocComment && attachModuleDocToExport && !moduleDocUsed) {
      moduleDocUsed = true;
      return true;
    }
    return false;
  }

  /**
   * Combine module-level and function-level documentation parts.
   *
   * @param {boolean} includeModuleDoc - Whether to include module documentation
   * @param {object|null} docComment - Function-level JSDoc comment object
   * @returns {{jsDoc?: string, pseudocode?: string}} Combined documentation parts
   */
  function buildDocParts(includeModuleDoc, docComment) {
    const docInfo = parseDoc(docComment);
    const jsDocParts = [];
    const pseudocodeParts = [];
    if (includeModuleDoc) {
      if (moduleDocInfo.jsDoc) jsDocParts.push(moduleDocInfo.jsDoc);
      if (moduleDocInfo.pseudocode) pseudocodeParts.push(moduleDocInfo.pseudocode);
    }
    if (docInfo.jsDoc) jsDocParts.push(docInfo.jsDoc);
    if (docInfo.pseudocode) pseudocodeParts.push(docInfo.pseudocode);
    return {
      jsDoc: jsDocParts.length ? jsDocParts.join("\n").trim() : undefined,
      pseudocode: pseudocodeParts.length ? pseudocodeParts.join("\n").trim() : undefined
    };
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
          if (!decl) {
            if (node.type === "ExportNamedDeclaration" && node.specifiers?.length) {
              const doc = findJsDoc(node.start);
              const includeModuleDoc = shouldIncludeModuleDoc();
              const { jsDoc, pseudocode } = buildDocParts(includeModuleDoc, doc);
              const snippetStart = doc ? doc.start : node.start;
              const snippet = source.slice(snippetStart, node.end);
              const exportNames = node.specifiers
                .map((spec) => {
                  // Handle both identifier exports (export { foo }) and string literal exports (export { "foo-bar" as bar })
                  if (spec.exported) {
                    if (spec.exported.type === "Identifier") return spec.exported.name;
                    if (spec.exported.type === "Literal") return String(spec.exported.value);
                  }
                  if (spec.local && spec.local.type === "Identifier") return spec.local.name;
                  return null;
                })
                .filter(Boolean);
              const slug = exportNames.length ? exportNames.join("-") : `empty-${node.start}`;
              chunks.push({
                id: `reexport-${slug}`,
                code: snippet,
                jsDoc,
                pseudocode,
                construct: "reexport",
                references: exportNames
              });
            }
            return;
          }
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
            const includeModuleDoc = shouldIncludeModuleDoc();
            const { jsDoc, pseudocode } = buildDocParts(includeModuleDoc, doc);
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
    if (moduleDocComment && !moduleDocUsed && !attachModuleDocToExport) {
      chunks.unshift({
        id: "module-doc",
        code: source.slice(moduleDocComment.start, moduleDocComment.end),
        jsDoc: moduleDocInfo.jsDoc,
        pseudocode: moduleDocInfo.pseudocode,
        construct: "module-doc",
        references: []
      });
    }
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
  const dataFiles = (await glob("src/data/*.{json,js}", { cwd: rootDir })).filter((f) => {
    const base = path.basename(f);
    if (base.startsWith("client_embeddings.")) return false;
    return ![
      "aesopsFables.json",
      "aesopsMeta.json",
      "countryCodeMapping.json",
      "offline_rag_metadata.json"
    ].includes(base);
  });
  const jsFiles = (
    await glob(["src/**/*.{js,ts}", "tests/**/*.{js,ts}"], {
      cwd: rootDir,
      ignore: ["**/node_modules/**", "src/data/**"]
    })
  ).filter((f) => !f.endsWith(".d.ts"));
  const cssFiles = await glob("src/styles/**/*.css", { cwd: rootDir });
  return Array.from(
    new Set([...designDocs, ...readmes, ...overviewDocs, ...dataFiles, ...jsFiles, ...cssFiles])
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
/**
 * Load a quantized MiniLM model for feature extraction.
 *
 * @pseudocode
 * 1. Configure Transformers.js for local model loading.
 * 2. Ensure required files exist and are non-empty.
 *    - If missing, warn and load remote model.
 * 3. Return a feature-extraction pipeline.
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
    const configPath = path.join(rootDir, modelDir, "config.json");
    const onnxPath = path.join(rootDir, modelDir, "onnx", "model_quantized.onnx");
    const tokenizerPath = path.join(rootDir, modelDir, "tokenizer.json");
    const tokenizerConfigPath = path.join(rootDir, modelDir, "tokenizer_config.json");
    let useLocal = true;
    for (const file of [configPath, onnxPath, tokenizerPath, tokenizerConfigPath]) {
      try {
        const stats = await stat(file);
        if (stats.size === 0) throw new Error("empty");
      } catch {
        useLocal = false;
        break;
      }
    }
    if (useLocal) {
      return pipeline("feature-extraction", modelDir, { quantized: true });
    }
    console.warn(
      "Quantized MiniLM files missing or empty; falling back to Xenova/all-MiniLM-L6-v2"
    );
    return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      quantized: true
    });
  }
  const { pipeline } = await import("@xenova/transformers");
  return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    quantized: true
  });
}

/**
 * Derive the tag set for a given file path.
 *
 * @pseudocode
 * 1. If the file is JSON or data JS, assign `data` tags with specific
 *    subcategories for judoka or tooltip files.
 * 2. If the file is JS/TS, categorize as either `code` or `test-code`.
 * 3. Otherwise mark as PRD documentation and add specific tags based on the
 *    document collection, including a precise match for agent workflow PRDs.
 * 4. Return the accumulated tag list.
 */
function determineTags(relativePath, ext, isTest) {
  const isDataJs = relativePath.startsWith("src/data/") && ext === ".js";
  if (ext === ".json" || isDataJs) {
    const tags = ["data"];
    const file = path.basename(relativePath);
    if (file === "judoka.json") tags.push("judoka-data");
    else if (file === "tooltips.json") tags.push("tooltip");
    else tags.push("game-data");
    return tags;
  }
  if (ext === ".js" || ext === ".ts") {
    const tags = [isTest ? "test-code" : "code"];
    const file = path.basename(relativePath);
    // Add semantic tags for specific implementation files
    if (file === "Card.js") tags.push("component");
    if (file === "chunkConfig.js") tags.push("constant", "config");
    if (file === "featureFlags.js") tags.push("feature-flag", "config");
    if (relativePath.includes("battleCLI")) tags.push("cli");
    if (file === "game.js") tags.push("initialization", "entry-point");
    return tags;
  }
  if (ext === ".css") {
    return ["styling", "css"];
  }
  const tags = ["prd"];
  if (relativePath.startsWith("design/productRequirementsDocuments")) {
    tags.push("design-doc");
    const fileName = path.basename(relativePath);
    // Add specific semantic tags for PRD documents
    if (fileName === "prdBattleCLI.md") tags.push("cli", "battle");
    if (fileName === "prdJudokaCard.md" || fileName.includes("Card")) {
      tags.push("component", "card");
    }
    if (fileName === "prdAIAgentWorkflows.md" || fileName === "prdVectorDatabaseRAG.md") {
      tags.push("agent-workflow");
    }
    if (
      relativePath.includes("prdDevelopmentStandards") ||
      relativePath.includes("prdTestingStandards") ||
      relativePath.includes("prdCodeStandards")
    ) {
      tags.push("design-guideline");
    }
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
      throw new Error("Output exceeds 38.8mb");
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

    // Defensive check: skip .d.ts files
    if (relativePath.endsWith(".d.ts")) continue;

    const isDataJs = relativePath.startsWith("src/data/") && ext === ".js";
    const isJson = ext === ".json";
    const isMarkdown = ext === ".md";
    const isJs = (ext === ".js" || ext === ".ts") && !isDataJs;
    const isTest =
      isJs &&
      (/\.test\.[jt]s$/.test(base) ||
        /\.spec\.[jt]s$/.test(base) ||
        relativePath.includes("/tests/"));
    const baseTags = determineTags(relativePath, ext, isTest);

    if (isJson || isDataJs) {
      const json = isJson ? JSON.parse(text) : (await import(pathToFileURL(fullPath))).default;
      const processItem = createJsonProcessItem({
        base,
        relativePath,
        baseTags,
        extractor,
        writeEntry,
        seenTexts
      });

      // Topic-aware data chunks: prefer key-path anchored entries
      if (Array.isArray(json)) {
        await processJsonArrayEntries(json, { baseName: base, processItem });
      } else if (json && typeof json === "object") {
        await processJsonObjectEntries(json, { baseName: base, processItem });
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
          contextPath: deriveContextPath({ source: `${relativePath} [chunk ${index + 1}]`, tags }),
          tags,
          metadata,
          version: CURRENT_EMBEDDING_VERSION
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
          contextPath: deriveContextPath({ source: `${relativePath} [${idSuffix}]`, tags }),
          tags,
          metadata,
          version: CURRENT_EMBEDDING_VERSION
        });
      }
    }
    // Basic CSS support: if file extension is .css
    if (ext === ".css") {
      const chunkText = normalizeAndFilter(text, seenTexts);
      if (!chunkText) continue;
      const idSuffix = `full-file`;
      const intent = determineIntent(chunkText);
      const metadata = buildMetadata(relativePath);
      const tagSet = new Set(["code", ...baseTags]);
      tagSet.add("css");
      tagSet.add(intent);
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
        contextPath: deriveContextPath({ source: `${relativePath} [${idSuffix}]`, tags }),
        tags,
        metadata,
        version: CURRENT_EMBEDDING_VERSION
      });
    }
  }

  const endStr = "\n]\n";
  if (bytesWritten + Buffer.byteLength(endStr, "utf8") > MAX_OUTPUT_SIZE) {
    writer.end();
    throw new Error("Output exceeds 38.8mb");
  }
  writer.end(endStr);
  await new Promise((resolve) => writer.on("finish", resolve));
  const stats = await stat(outputPath);
  const avgLength = entryCount ? Number((vectorLengthTotal / entryCount).toFixed(2)) : 0;
  const meta = {
    count: entryCount,
    avgVectorLength: avgLength,
    fileSizeKB: Number((stats.size / 1024).toFixed(2)),
    version: CURRENT_EMBEDDING_VERSION
  };
  await writeFile(
    path.join(rootDir, "src/data/client_embeddings.meta.json"),
    JSON.stringify(meta, null, 2)
  );
}

/**
 * Internal test helpers for JSON processing functions.
 *
 * @internal These functions are exposed only for testing purposes and should not be used in production code.
 * @property {typeof createJsonProcessItem} createJsonProcessItem - Builds a processor that normalizes,
 *   embeds, and writes individual JSON entries.
 * @property {typeof processJsonArrayEntries} processJsonArrayEntries - Iterates array items, skipping
 *   entries without allowlisted text before invoking the provided processor.
 * @property {typeof processJsonObjectEntries} processJsonObjectEntries - Walks objects to flatten key
 *   paths and dispatch each value to the processor.
 */
const __jsonTestHelpers = {
  createJsonProcessItem,
  processJsonArrayEntries,
  processJsonObjectEntries
};

const __codeTestHelpers = {
  chunkCode
};

export {
  DATA_FIELD_ALLOWLIST,
  JSON_FIELD_ALLOWLIST,
  flattenObject,
  BOILERPLATE_STRINGS,
  normalizeText,
  normalizeAndFilter,
  extractAllowedValues,
  createSparseVector,
  determineTags,
  /** @internal */ __jsonTestHelpers,
  /** @internal */ __codeTestHelpers
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await generate();
}
