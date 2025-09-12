/**
 * RAG preflight checks for CI and local validation.
 *
 * Checks:
 * - Strict offline model presence when RAG_STRICT_OFFLINE=1
 * - Offline artifacts consistency: metadata vs binary vector file
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, stat } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");

const REQUIRED_MODEL_FILES = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  path.join("onnx", "model_quantized.onnx")
];

async function fileExistsNonEmpty(p) {
  try {
    const s = await stat(p);
    return s.size > 0;
  } catch {
    return false;
  }
}

export async function checkStrictOfflineModel(env = process.env) {
  const errors = [];
  const strict = env?.RAG_STRICT_OFFLINE === "1";
  if (!strict) return { ok: true, errors };
  const modelDir = path.join(srcDir, "models", "minilm");
  for (const rel of REQUIRED_MODEL_FILES) {
    const full = path.join(modelDir, rel);
    const ok = await fileExistsNonEmpty(full);
    if (!ok) errors.push(`Strict offline: missing model file ${path.relative(rootDir, full)}`);
  }
  return { ok: errors.length === 0, errors };
}

export async function checkOfflineArtifacts() {
  const errors = [];
  const metaPath = path.join(srcDir, "data", "offline_rag_metadata.json");
  const vecPath = path.join(srcDir, "data", "offline_rag_vectors.bin");
  try {
    const raw = await readFile(metaPath, "utf8");
    const meta = JSON.parse(raw);
    const vectorLength = Number(meta.vectorLength || 0);
    const count = Number(meta.count || 0);
    if (!vectorLength || !count) {
      errors.push("Offline artifacts: vectorLength or count missing/zero in metadata");
    } else {
      const buf = await readFile(vecPath);
      const expected = vectorLength * count; // Int8Array bytes
      if (buf.byteLength !== expected) {
        errors.push(
          `Offline artifacts: vector bin length ${buf.byteLength} != expected ${expected} (` +
            `${vectorLength} x ${count})`
        );
      }
    }
  } catch {
    errors.push(
      `Offline artifacts: failed to read files (${path.relative(rootDir, metaPath)}, ${path.relative(
        rootDir,
        vecPath
      )})`
    );
  }
  return { ok: errors.length === 0, errors };
}

export async function checkPreflight() {
  const issues = [];
  const a = await checkStrictOfflineModel();
  if (!a.ok) issues.push(...a.errors);
  const b = await checkOfflineArtifacts();
  if (!b.ok) issues.push(...b.errors);
  return { ok: issues.length === 0, errors: issues };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const res = await checkPreflight();
  if (!res.ok) {
    console.error("RAG preflight failed:\n- " + res.errors.join("\n- "));
    process.exit(1);
  }

  console.log("RAG preflight: OK");
}
