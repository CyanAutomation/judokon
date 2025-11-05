/**
 * Prepare a local quantized MiniLM model under models/minilm for offline RAG queries.
 *
 * @pseudocode
 * 1. Parse CLI args (e.g., --from-dir) for a local seed directory.
 * 2. Determine repo root and destination path models/minilm (+ onnx/ subdir).
 * 3. If from-dir provided:
 *    - Validate required files exist (config.json, tokenizer.json, tokenizer_config.json, onnx/model_quantized.onnx).
 *    - Copy files into destination, creating folders as needed.
 *    - Print success and exit.
 * 4. Else attempt to hydrate via @xenova/transformers (may download when network available):
 *    - Configure env.allowLocalModels, env.cacheDir (models), and env.localModelPath (repo root).
 *    - Instantiate a quantized feature-extraction pipeline for Xenova/all-MiniLM-L6-v2.
 *    - If successful, copy/cache files into models/minilm.
 * 5. On failure, print actionable guidance for strict-offline environments.
 */
import { mkdir, stat, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
// Destination aligns with getExtractor() which resolves the repository root from src/helpers/api
const destRoot = rootDir;

const REQUIRED = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  path.join("onnx", "model_quantized.onnx")
];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from-dir" && argv[i + 1]) {
      out.fromDir = argv[++i];
    } else if (a === "--force") {
      out.force = true;
    }
  }
  return out;
}

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function fileNonEmpty(p) {
  const s = await stat(p);
  return s.size > 0;
}

async function validateModelIntegrity(destDir) {
  /**
   * Verify model files exist, are non-empty, and have correct sizes.
   * Returns { isValid, corruptedFiles }
   */
  const corruptedFiles = [];

  for (const rel of REQUIRED) {
    const fullPath = path.join(destDir, rel);
    try {
      const s = await stat(fullPath);
      if (s.size === 0) {
        corruptedFiles.push({ file: rel, size: 0, reason: "empty file" });
      }
      // Files shouldn't be suspiciously small (except config and tokenizer_config)
      if (
        (rel.endsWith(".onnx") && s.size < 1000000) ||
        (rel === "tokenizer.json" && s.size < 100000)
      ) {
        corruptedFiles.push({ file: rel, size: s.size, reason: "suspiciously small" });
      }
    } catch {
      corruptedFiles.push({ file: rel, reason: "missing or unreadable" });
    }
  }

  return {
    isValid: corruptedFiles.length === 0,
    corruptedFiles
  };
}

async function copyFromDir(fromDir, destDir) {
  await ensureDir(destDir);
  await ensureDir(path.join(destDir, "onnx"));
  for (const rel of REQUIRED) {
    const src = path.resolve(fromDir, rel);
    const dst = path.resolve(destDir, rel);
    try {
      await stat(src);
    } catch {
      throw new Error(`Missing required file in --from-dir: ${rel}`);
    }
    await ensureDir(path.dirname(dst));
    await cp(src, dst);
    if (!(await fileNonEmpty(dst))) {
      throw new Error(`Copied file is empty: ${rel}`);
    }
  }
}

async function populateFromCache(cacheDir, destDir, options = {}) {
  const cacheModelDir = path.join(cacheDir, "Xenova", "all-MiniLM-L6-v2");
  try {
    await stat(cacheModelDir);
  } catch {
    return false;
  }

  await ensureDir(destDir);
  await ensureDir(path.join(destDir, "onnx"));

  let copiedAny = false;
  for (const rel of REQUIRED) {
    const src = path.join(cacheModelDir, rel);
    const dst = path.join(destDir, rel);
    try {
      await stat(src);
    } catch {
      throw new Error(`Cached model is missing required file: ${rel}`);
    }

    let hasExisting = false;
    let existingSize = 0;
    try {
      const dstStat = await stat(dst);
      existingSize = dstStat.size;
      hasExisting = await fileNonEmpty(dst);
    } catch {}

    // Get source file size for validation
    let srcSize = 0;
    try {
      const srcStat = await stat(src);
      srcSize = srcStat.size;
    } catch {
      throw new Error(`Cannot stat source file: ${rel}`);
    }

    // Recopy if existing file is corrupted (size mismatch) or missing
    const isSizeMatch = existingSize === srcSize;
    const shouldRecopy = !hasExisting || options.force || (hasExisting && !isSizeMatch);

    if (shouldRecopy) {
      await ensureDir(path.dirname(dst));
      await cp(src, dst, { force: true });
      copiedAny = true;
      if (!isSizeMatch && hasExisting) {
        console.log(
          `Repaired corrupted file: ${rel} (was ${existingSize} bytes, now ${srcSize} bytes)`
        );
      }
    } else {
      console.log(`Skipping existing file: ${rel} (use --force to overwrite)`);
    }

    if (!(await fileNonEmpty(dst))) {
      throw new Error(`Cached model produced empty file: ${rel}`);
    }

    // Post-copy verification: ensure file size matches
    const postStat = await stat(dst);
    if (postStat.size !== srcSize) {
      throw new Error(
        `File size mismatch after copy: ${rel} (expected ${srcSize}, got ${postStat.size}). ` +
          `This may indicate a failed write or filesystem issue.`
      );
    }
  }

  return copiedAny;
}

export async function prepareLocalModel(options = {}) {
  const destDir = path.join(destRoot, "models", "minilm");
  const { fromDir } = options;

  if (fromDir) {
    await copyFromDir(fromDir, destDir);
    return { ok: true, source: "from-dir", destDir };
  }

  // Check if files are already corrupted and need repair
  const { isValid: initialValid, corruptedFiles: initialCorrupted } =
    await validateModelIntegrity(destDir);
  if (!initialValid && initialCorrupted.length > 0) {
    console.log(`[RAG] Detected corrupted model files, attempting repair:`);
    for (const file of initialCorrupted) {
      console.log(`  - ${file.file}: ${file.reason}`);
    }
    options = { ...options, force: true }; // Force repair
  }

  // Attempt hydration via transformers (may fetch if not cached)
  try {
    const { pipeline, env } = await import("@xenova/transformers");
    const cacheDir = path.join(destRoot, "models");
    const localModelDir = path.join(cacheDir, "minilm");
    env.allowLocalModels = true;
    env.cacheDir = cacheDir;
    env.localModelPath = destRoot;
    console.log(`[RAG] Preparing local model with configuration:`);
    console.log(`  - Repository root (localModelPath): ${destRoot}`);
    console.log(`  - Cache directory: ${cacheDir}`);
    console.log(`  - Model will be resolved as: ${path.join(destRoot, "models/minilm")}`);
    console.log(`  - Allow local models: true`);
    // Prepare dest directories to allow caching to land in-place
    await ensureDir(cacheDir);
    await ensureDir(localModelDir);
    await ensureDir(path.join(localModelDir, "onnx"));
    const seededFromCache = await populateFromCache(cacheDir, destDir, options);
    // Instantiating the pipeline may populate caches; we still ensure required files exist.
    await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { quantized: true });
    if (options.force || !seededFromCache) {
      await populateFromCache(cacheDir, destDir, options);
    }
  } catch (err) {
    const msg = String(err?.message || err).toLowerCase();
    throw new Error(
      `Unable to hydrate model via transformers (${msg}). ` +
        `If running offline, place files via: npm run rag:prepare:models -- --from-dir <path-with-minilm>`
    );
  }

  // Validate files landed (either via cache or post-step)
  for (const rel of REQUIRED) {
    const full = path.join(destDir, rel);
    if (!(await fileNonEmpty(full))) {
      throw new Error(
        `Model file is missing or empty after hydration attempt: ${rel}. ` +
          "This may indicate a problem with the cache population or transformers pipeline."
      );
    }
  }

  // Final integrity check
  const { isValid: finalValid, corruptedFiles: finalCorrupted } =
    await validateModelIntegrity(destDir);
  if (!finalValid) {
    const files = finalCorrupted.map((f) => `${f.file} (${f.reason})`).join(", ");
    throw new Error(
      `Model files failed final integrity check after hydration: ${files}. ` +
        "This may indicate a filesystem or cache issue."
    );
  }

  return { ok: true, source: "transformers", destDir };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  prepareLocalModel(args)
    .then((res) => {
      console.log(`Local MiniLM prepared at: ${res.destDir} (source=${res.source})`);
    })
    .catch((err) => {
      console.error("Model preparation failed:", err.message || err);
      process.exit(1);
    });
}
