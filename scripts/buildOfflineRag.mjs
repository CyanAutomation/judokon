/**
 * Build offline RAG assets from client embeddings.
 *
 * @pseudocode
 * 1. Load `src/data/client_embeddings.json` entries.
 * 2. For each item:
 *    - Quantize the embedding to an Int8Array.
 *    - Create metadata without the embedding field.
 *    - Generate a sparse vector using `createSparseVector`.
 * 3. Write all vectors to `src/data/offline_rag_vectors.bin`.
 * 4. Write metadata and summary info to `src/data/offline_rag_metadata.json`.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSparseVector } from "./generateEmbeddings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

/**
 * Convert a float embedding array to an Int8Array.
 *
 * @param {number[]} embedding - Float embedding values in the range [-1, 1].
 * @returns {Int8Array} Quantized vector.
 */
function toInt8(embedding) {
  return Int8Array.from(embedding, (v) => Math.max(-128, Math.min(127, Math.round(v * 127))));
}

/**
 * Generate offline RAG vectors and metadata.
 */
export async function buildOfflineRag() {
  const inputPath = path.join(rootDir, "src/data/client_embeddings.json");
  const raw = await readFile(inputPath, "utf8");
  const entries = JSON.parse(raw);

  const vectors = [];
  const metaItems = [];

  for (const { embedding, text, qaContext, source, tags, metadata, id } of entries) {
    vectors.push(toInt8(embedding));
    metaItems.push({
      id,
      text,
      qaContext,
      source,
      tags,
      metadata,
      sparseVector: createSparseVector(text)
    });
  }

  const vectorLength = vectors[0]?.length || 0;
  const buffer = Buffer.concat(vectors.map((v) => Buffer.from(v.buffer)));

  await writeFile(path.join(rootDir, "src/data/offline_rag_vectors.bin"), buffer);
  await writeFile(
    path.join(rootDir, "src/data/offline_rag_metadata.json"),
    JSON.stringify({ vectorLength, count: metaItems.length, items: metaItems }, null, 2)
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await buildOfflineRag();
  } catch (err) {
    console.error("Offline RAG build failed:", err);
    process.exit(1);
  }
}
