/* eslint-env node */
/**
 * Generate embeddings for PRD markdown and JSON data files.
 *
 * @pseudocode
 * 1. Discover markdown and JSON files using glob.
 * 2. Read file contents and truncate long text.
 * 3. Load a transformer model for feature extraction.
 * 4. Encode each text block into a mean-pooled embedding vector.
 * 5. Build output objects with id, text, embedding, source, tags, and version.
 * 6. Ensure the final JSON output is under MAX_OUTPUT_SIZE (3MB), pretty-print it, and write to disk.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import { pipeline } from "@xenova/transformers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const MAX_TEXT_LENGTH = 1000;
const MAX_OUTPUT_SIZE = 3 * 1024 * 1024;

async function getFiles() {
  const prdFiles = await glob("design/productRequirementsDocuments/*.md", {
    cwd: rootDir
  });
  const guidelineFiles = await glob("design/codeStandards/*.md", { cwd: rootDir });
  const workflowFiles = await glob("design/agentWorkflows/*.md", { cwd: rootDir });
  const jsonFiles = (await glob("src/data/*.json", { cwd: rootDir })).filter(
    (f) => path.extname(f) === ".json"
  );
  return [...prdFiles, ...guidelineFiles, ...workflowFiles, ...jsonFiles];
}

async function loadModel() {
  return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
}

async function generate() {
  const files = await getFiles();
  const extractor = await loadModel();
  const output = [];

  for (const relativePath of files) {
    const fullPath = path.join(rootDir, relativePath);
    let text = await readFile(fullPath, "utf8");
    if (relativePath.endsWith(".json")) {
      text = JSON.stringify(JSON.parse(text));
    }
    text = text.slice(0, MAX_TEXT_LENGTH);
    const embedding = Array.from(await extractor(text, { pooling: "mean" }));
    output.push({
      id: path.basename(relativePath),
      text,
      embedding,
      source: relativePath,
      tags: [relativePath.endsWith(".json") ? "data" : "prd"],
      version: 1
    });
  }

  const jsonString = JSON.stringify(output, null, 2);
  if (Buffer.byteLength(jsonString, "utf8") > MAX_OUTPUT_SIZE) {
    throw new Error("Output exceeds 3MB");
  }
  await writeFile(path.join(rootDir, "src/data/client_embeddings.json"), jsonString);
}

await generate();
