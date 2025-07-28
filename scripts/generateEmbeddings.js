/* eslint-env node */
/**
 * Generate embeddings for PRD markdown and JSON data files.
 *
 * @pseudocode
 * 1. Use glob to gather markdown and JSON sources, skipping existing
 *    `client_embeddings.json` and large datasets.
 * 2. Load the quantized transformer model for feature extraction to reduce
 *    memory usage.
 * 3. For each file:
 *    - If markdown, group the text into sections from one heading to the next
 *      heading of the same or higher level.
 *      * Split any section longer than CHUNK_SIZE using OVERLAP for context.
 *    - If JSON, parse the contents.
 *      * When the root is an array, embed each item individually.
 *      * When the root is an object, embed each key/value pair.
 * 4. Encode each chunk or entry using mean pooling and round the values.
 * 5. Build output objects with id, text, embedding, source, tags, and version.
 *    - Tags include both a broad category ("prd" or "data") and more specific
 *      labels such as "judoka-data" or "tooltip".
 * 6. Stream each output object directly to `client_embeddings.json` using
 *    `fs.createWriteStream`.
 *    - Track bytes written and abort if the total exceeds MAX_OUTPUT_SIZE (3 MB).
 * 7. After writing the file, record the total count, average vector length,
 *    and output size in `client_embeddings.meta.json`.
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import { pipeline } from "@xenova/transformers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Larger chunks reduce the total embedding count and help keep the
// final JSON under the 3MB limit. Bump slightly to shrink output.
const CHUNK_SIZE = 2000;
const OVERLAP = 100;
const MAX_OUTPUT_SIZE = 3 * 1024 * 1024;

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

async function getFiles() {
  const prdFiles = await glob("design/productRequirementsDocuments/*.md", {
    cwd: rootDir
  });
  const guidelineFiles = await glob("design/codeStandards/*.md", { cwd: rootDir });
  const workflowFiles = await glob("design/agentWorkflows/*.md", { cwd: rootDir });
  const jsonFiles = (await glob("src/data/*.json", { cwd: rootDir })).filter(
    (f) =>
      path.extname(f) === ".json" &&
      !["client_embeddings.json", "aesopsFables.json", "aesopsMeta.json"].includes(path.basename(f))
  );
  return [...prdFiles, ...guidelineFiles, ...workflowFiles, ...jsonFiles];
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

function determineTags(relativePath, isJson) {
  const tags = [isJson ? "data" : "prd"];
  if (isJson) {
    const file = path.basename(relativePath);
    if (file === "judoka.json") tags.push("judoka-data");
    else if (file === "tooltips.json") tags.push("tooltip");
    else tags.push("game-data");
  } else if (relativePath.startsWith("design/productRequirementsDocuments")) {
    tags.push("design-doc");
  } else if (relativePath.startsWith("design/codeStandards")) {
    tags.push("design-guideline");
  } else if (relativePath.startsWith("design/agentWorkflows")) {
    tags.push("agent-workflow");
  }
  return tags;
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
    const serialized = JSON.stringify(obj, null, 2)
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n");
    const chunk = (first ? "\n" : ",\n") + serialized;
    const size = Buffer.byteLength(chunk + "\n]", "utf8");
    if (bytesWritten + size > MAX_OUTPUT_SIZE) {
      writer.end();
      throw new Error("Output exceeds 3MB");
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
    const isJson = relativePath.endsWith(".json");
    const tags = determineTags(relativePath, isJson);

    if (isJson) {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        for (const [index, item] of json.entries()) {
          const chunkText = JSON.stringify(item);
          const result = await extractor(chunkText, { pooling: "mean" });
          writeEntry({
            id: `${base}-${index + 1}`,
            text: chunkText,
            embedding: Array.from(result.data ?? result).map((v) => Number(v.toFixed(4))),
            source: `${relativePath} [${index}]`,
            tags,
            version: 1
          });
        }
      } else if (json && typeof json === "object") {
        for (const [key, value] of Object.entries(json)) {
          const chunkText = typeof value === "string" ? value : JSON.stringify(value);
          const result = await extractor(chunkText, { pooling: "mean" });
          writeEntry({
            id: `${base}-${key}`,
            text: chunkText,
            embedding: Array.from(result.data ?? result).map((v) => Number(v.toFixed(4))),
            source: `${relativePath} [${key}]`,
            tags,
            version: 1
          });
        }
      }
    } else {
      const chunks = chunkMarkdown(text);
      for (const [index, chunkText] of chunks.entries()) {
        const result = await extractor(chunkText, { pooling: "mean" });
        writeEntry({
          id: `${base}-chunk-${index + 1}`,
          text: chunkText,
          embedding: Array.from(result.data ?? result).map((v) => Number(v.toFixed(4))),
          source: `${relativePath} [chunk ${index + 1}]`,
          tags,
          version: 1
        });
      }
    }
  }

  const endStr = "\n]\n";
  if (bytesWritten + Buffer.byteLength(endStr, "utf8") > MAX_OUTPUT_SIZE) {
    writer.end();
    throw new Error("Output exceeds 3MB");
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
