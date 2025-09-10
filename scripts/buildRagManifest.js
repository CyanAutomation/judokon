/* eslint-env node */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const EMB_PATH = path.join(ROOT, "src/data/client_embeddings.json");
const OUT_DIR = path.join(ROOT, "src/rag");
const META_PATH = path.join(OUT_DIR, "meta.json");
const INDEX_PATH = path.join(OUT_DIR, "index-manifest.json");

async function main() {
  const raw = await readFile(EMB_PATH, "utf8");
  const items = JSON.parse(raw);
  const total = Array.isArray(items) ? items.length : 0;
  const bySource = {};
  const byTag = {};
  let dim = 0;
  for (const it of items) {
    const s = String(it.source || "unknown");
    bySource[s] = (bySource[s] || 0) + 1;
    const tags = Array.isArray(it.tags) ? it.tags : [];
    for (const t of tags) byTag[t] = (byTag[t] || 0) + 1;
    if (Array.isArray(it.embedding) && it.embedding.length) dim = it.embedding.length;
  }
  await mkdir(OUT_DIR, { recursive: true });
  const meta = {
    corpusVersion: 1,
    model: "MiniLM (Xenova)",
    dim,
    chunkingVersion: 1,
    lastUpdated: new Date().toISOString()
  };
  await writeFile(META_PATH, JSON.stringify(meta, null, 2));
  await writeFile(INDEX_PATH, JSON.stringify({ total, bySource, byTag }, null, 2));
  console.log(`Wrote ${META_PATH} and ${INDEX_PATH} (total items: ${total}, dim: ${dim})`);
}

main().catch((err) => {
  console.error("Failed to build RAG manifest:", err);
  process.exit(1);
});
