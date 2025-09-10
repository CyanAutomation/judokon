/* eslint-env node */
import { readFile } from "node:fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pipeline, env } from "@xenova/transformers";
import vectorSearch from "../../src/helpers/vectorSearch/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

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

async function loadModel() {
  // Logic copied from the working generateEmbeddings.js script
  if (typeof process !== "undefined" && process.versions?.node) {
    const { stat } = await import("node:fs/promises");
    const { createRequire } = await import("node:module");
    const nodeRequire = createRequire(import.meta.url);

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
      // ONNX runtime not found, use library defaults
    }
    env.backends.onnx.wasm.proxy = false;
    const modelDir = path.join("models", "minilm");
    const configPath = path.join(rootDir, modelDir, "config.json");

    try {
      await stat(configPath);
      return pipeline("feature-extraction", modelDir, { quantized: true });
    } catch {
      console.warn(
        "Local model not found; falling back to Xenova/all-MiniLM-L6-v2"
      );
      return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        quantized: true
      });
    }
  }
  return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    quantized: true
  });
}

export async function evaluate() {
  const model = await loadModel();

  const queriesPath = path.join(rootDir, "scripts/evaluation/queries.json");
  const queries = JSON.parse(await readFile(queriesPath, "utf8"));

  let mrr5 = 0;
  let recall3 = 0;
  let recall5 = 0;

  for (const { query, expected_source } of queries) {
    const queryEmbedding = await model(query, { pooling: "mean" });
    const sparseQueryVector = createSparseVector(query);
    const results = await vectorSearch.findMatches(
      Array.from(queryEmbedding.data),
      5,
      [],
      query,
      sparseQueryVector
    );

    let rank = 0;
    for (let i = 0; i < results.length; i++) {
      if (results[i].source.startsWith(expected_source)) {
        rank = i + 1;
        break;
      }
    }

    if (rank > 0) {
      if (rank <= 5) {
        mrr5 += 1 / rank;
      }
      if (rank <= 3) {
        recall3++;
      }
      if (rank <= 5) {
        recall5++;
      }
    }
  }

  console.log(`MRR@5: ${mrr5 / queries.length}`);
  console.log(`Recall@3: ${recall3 / queries.length}`);
  console.log(`Recall@5: ${recall5 / queries.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await evaluate();
}

export { createSparseVector };
