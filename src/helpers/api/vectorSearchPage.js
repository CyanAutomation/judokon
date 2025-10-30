import { isNodeEnvironment } from "../env.js";

const HYDRATION_GUIDANCE_MESSAGE =
  "Network unreachable while loading remote MiniLM model. " +
  "Fix: hydrate a local model at models/minilm via `npm run rag:prepare:models -- --from-dir <path>` " +
  "or run with RAG_STRICT_OFFLINE=1 to avoid CDN attempts. " +
  "Optionally enable degraded search with RAG_ALLOW_LEXICAL_FALLBACK=1.";

const STRICT_OFFLINE_MESSAGE =
  "Strict offline mode: local model missing at models/minilm. " +
  "Provide a local MiniLM (quantized) or unset RAG_STRICT_OFFLINE.";

function createHydrationGuidanceError(cause) {
  const wrapped = new Error(HYDRATION_GUIDANCE_MESSAGE);
  if (cause) {
    try {
      wrapped.cause = cause;
    } catch {}
  }
  return wrapped;
}

let extractor;

/**
 * Similarity threshold separating strong from weak matches.
 *
 * @summary Score threshold used to classify strong matches returned by the vector search.
 * @pseudocode
 * 1. A match with score >= SIMILARITY_THRESHOLD is considered a strong match.
 * 2. Consumers use this value to decide whether to show a strong result warning.
 *
 * @returns {number} Threshold value between 0 and 1.
 */
export const SIMILARITY_THRESHOLD = 0.6;

/**
 * Score difference threshold for strong matches.
 * When the top score exceeds the second best by more than this value,
 * only the highest scoring result is shown.
 * @type {number}
 */
const DROP_OFF_THRESHOLD = 0.4;

/**
 * Select matches to render based on similarity scores.
 *
 * @pseudocode
 * 1. If `strongMatches` has entries:
 *    a. When multiple strong matches and the score gap between the first two exceeds `DROP_OFF_THRESHOLD`, return only the first.
 *    b. Otherwise, return all strong matches.
 * 2. If no strong matches, return the first three `weakMatches`.
 *
 * @param {Array<{score:number}>} strongMatches - Results meeting the similarity threshold.
 * @param {Array<{score:number}>} weakMatches - Results below the threshold.
 * @returns {Array} Matches chosen for display.
 */
export function selectMatches(strongMatches, weakMatches) {
  if (strongMatches.length > 0) {
    if (
      strongMatches.length > 1 &&
      strongMatches[0].score - strongMatches[1].score > DROP_OFF_THRESHOLD
    ) {
      return [strongMatches[0]];
    }
    return strongMatches;
  }
  return weakMatches.slice(0, 3);
}

/**
 * Load the MiniLM feature extractor on first use.
 *
 * @pseudocode
 * 1. If `extractor` is already initialized (cached), return it immediately.
 * 2. If `extractor` is not initialized, begin a `try...catch` block to handle potential loading errors:
 *    a. Inside the `try` block:
 *       i. Import the `pipeline` function from Transformers.js (use CDN in browsers, local package in Node).
 *       ii. In Node, resolve the local `models/minilm` directory with `pathToFileURL` and instantiate a quantized pipeline from that path.
 *       iii. In browsers, instantiate a quantized pipeline using the "Xenova/all-MiniLM-L6-v2" CDN model name.
 *       iv. Assign the created pipeline instance to `extractor`.
 *    b. In the `catch` block (if an error occurs during loading):
 *       i. Log an error message "Model failed to load" along with the `error` object to the console.
 *       ii. Reset `extractor` to `null` to ensure that the next call will re-attempt loading.
 *       iii. Re-throw the `error` to propagate the failure to the caller.
 * 3. Return the initialized `extractor` instance.
 *
 * @returns {Promise<any>} The feature extraction pipeline instance.
 */
export async function getExtractor() {
  if (!extractor) {
    try {
      if (isNodeEnvironment()) {
        const { pipeline, env } = await import("@xenova/transformers");
        const { stat } = await import("fs/promises");
        const { createRequire } = await import("module");
        const { resolve, dirname, sep } = await import("path");
        const { fileURLToPath } = await import("url");
        const nodeRequire = createRequire(import.meta.url);
        const modulePath = fileURLToPath(import.meta.url);
        const moduleDir = dirname(modulePath);
        const rootDir = resolve(moduleDir, "..", "..", "..");

        env.allowLocalModels = true;
        env.localModelPath = rootDir;
        console.debug(`[RAG] Configuring local model resolution with localModelPath=${rootDir}`);

        try {
          const workerPath = nodeRequire.resolve(
            "onnxruntime-web/dist/ort-wasm-simd-threaded.worker.js"
          );
          await stat(workerPath);
          const ortDir = dirname(workerPath);
          env.backends.onnx.wasm.wasmPaths = ortDir + sep;
          env.backends.onnx.wasm.worker = workerPath;
        } catch {
          // ONNX runtime not found, use library defaults
        }

        env.backends.onnx.wasm.proxy = false;
        const modelDir = "models/minilm";
        const modelDirAbs = resolve(rootDir, modelDir);
        const strictOffline = process?.env?.RAG_STRICT_OFFLINE === "1";
        console.debug(
          `[RAG] Checking for local model at: ${modelDirAbs} (strict offline: ${strictOffline})`
        );

        const assetDescriptors = [
          { label: "config.json", path: resolve(modelDirAbs, "config.json"), minBytes: 50 },
          { label: "tokenizer.json", path: resolve(modelDirAbs, "tokenizer.json"), minBytes: 500 },
          {
            label: "tokenizer_config.json",
            path: resolve(modelDirAbs, "tokenizer_config.json"),
            minBytes: 50
          },
          {
            label: "onnx/model_quantized.onnx",
            path: resolve(modelDirAbs, "onnx/model_quantized.onnx"),
            minBytes: 500_000
          }
        ];

        const assetChecks = await Promise.allSettled(
          assetDescriptors.map(async (asset) => {
            const info = await stat(asset.path);
            return { asset, info };
          })
        );

        const missingAssets = [];
        const placeholderAssets = [];

        for (const [index, result] of assetChecks.entries()) {
          const descriptor = assetDescriptors[index];
          if (result.status === "rejected") {
            missingAssets.push({ asset: descriptor, error: result.reason });
            continue;
          }

          const { info } = result.value;
          if (
            typeof descriptor.minBytes === "number" &&
            typeof info?.size === "number" &&
            info.size < descriptor.minBytes
          ) {
            placeholderAssets.push({ asset: descriptor, info });
          }
        }

        if (missingAssets.length > 0) {
          if (strictOffline) {
            const missingPaths = missingAssets.map(({ asset }) => `    - ${asset.path}`).join("\n");
            throw new Error(`${STRICT_OFFLINE_MESSAGE}\n\nMissing files:\n${missingPaths}`);
          }
          const details = missingAssets.map(({ asset }) => asset.label).join(", ");
          console.warn(
            `RAG: Local MiniLM assets missing (${details}); falling back to Xenova/all-MiniLM-L6-v2 from CDN. ${HYDRATION_GUIDANCE_MESSAGE}`
          );
          extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
            quantized: true
          });
        } else if (placeholderAssets.length > 0) {
          if (strictOffline) {
            const placeholderPaths = placeholderAssets
              .map(({ asset, info }) => `    - ${asset.path} (${info?.size || 0} bytes)`)
              .join("\n");
            throw new Error(
              `${STRICT_OFFLINE_MESSAGE}\n\nFiles appear to be placeholders:\n${placeholderPaths}`
            );
          }
          const details = placeholderAssets.map(({ asset }) => asset.label).join(", ");
          const placeholderError = new Error(`MiniLM assets appear to be placeholders: ${details}`);
          throw createHydrationGuidanceError(placeholderError);
        } else {
          extractor = await pipeline("feature-extraction", modelDir, { quantized: true });
          console.log("RAG: Successfully loaded local MiniLM model.");
        }
      } else {
        if (typeof process !== "undefined" && process?.env?.RAG_STRICT_OFFLINE === "1") {
          throw new Error(
            "Strict offline mode: browser CDN path disabled. Provide local model in Node."
          );
        }
        const { pipeline } = await import(
          "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/dist/transformers.min.js"
        );
        extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
          quantized: true
        });
      }
    } catch (error) {
      // Provide actionable guidance when network is unavailable
      const msg = String(error?.message || error);
      if (/ENET(?:UNREACH|DOWN|RESET|REFUSED)/i.test(msg) || /fetch failed/i.test(msg)) {
        console.error("Model failed to load (offline)", error);
        extractor = null;
        throw createHydrationGuidanceError(error);
      }
      console.error("Model failed to load", error);
      extractor = null;
      throw error;
    }
  }
  return extractor;
}

/**
 * Preload the feature extractor in the background.
 *
 * @summary Trigger extractor initialization to reduce first-call latency.
 * @pseudocode
 * 1. Call `getExtractor()` to start loading the model.
 * 2. Swallow any errors so initialization is non-blocking.
 * @returns {void}
 */
export function preloadExtractor() {
  getExtractor().catch(() => {});
}

/**
 * Inject a custom extractor implementation (test helper).
 *
 * @summary Replace the internal `extractor` instance for testing or mocking.
 * @pseudocode
 * 1. Assign the provided `model` to the internal `extractor` variable so subsequent calls use it.
 * @param {any} model - Mock or alternative extractor to use.
 * @returns {void}
 */
export function __setExtractor(model) {
  extractor = model;
}
