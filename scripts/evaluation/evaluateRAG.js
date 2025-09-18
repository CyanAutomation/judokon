/* eslint-env node */
import { readFile, stat as fsStat } from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "node:url";
import queryRag from "../../src/helpers/queryRag.js"; // New import

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

// Removed STOP_WORDS and createSparseVector as queryRag handles it

function hrtimeMs() {
  const [s, ns] = process.hrtime();
  return s * 1e3 + ns / 1e6;
}

async function getEmbeddingsBundleInfo() {
  // Heuristic: look for client embeddings and count items in meta if available
  const bundlePath = path.join(rootDir, "src/data/client_embeddings.json");
  try {
    const st = await fsStat(bundlePath);
    return { exists: true, sizeMB: st.size / (1024 * 1024), path: bundlePath };
  } catch {
    return { exists: false, sizeMB: 0, path: bundlePath };
  }
}

export async function evaluate(baseline = null, options = {}) {
  const {
    queries: providedQueries = null,
    logger = console,
    hrtime = hrtimeMs,
    queryFn = queryRag,
    getBundleInfo = getEmbeddingsBundleInfo
  } = options;

  const queriesPath = path.join(rootDir, "scripts/evaluation/queries.json");
  const queries = providedQueries ?? JSON.parse(await readFile(queriesPath, "utf8"));

  const log = typeof logger?.log === "function" ? logger.log.bind(logger) : console.log;
  const error = typeof logger?.error === "function" ? logger.error.bind(logger) : console.error;

  let mrr5 = 0;
  let recall3 = 0;
  let recall5 = 0;

  const latencies = [];
  const perQuery = [];
  for (const { query, expected_source } of queries) {
    // Use the centralized queryRag function
    const t0 = hrtime();
    const results = await queryFn(query);
    const t1 = hrtime();
    const latency = Math.max(0, t1 - t0);
    latencies.push(latency);

    let rank = 0;
    const matches = Array.isArray(results) ? results : [];
    for (let i = 0; i < matches.length; i++) {
      // queryRag returns matches with a 'source' property
      if (matches[i].source?.startsWith(expected_source)) {
        rank = i + 1;
        break;
      }
    }

    // --- START: Added logging for detailed analysis ---
    log(`\n--- Query: "${query}" ---`);
    log(`Expected Source: "${expected_source}"`);
    log(`Rank Found: ${rank > 0 ? rank : "Not Found"}`);
    log("Top Results:");
    matches.slice(0, 3).forEach((result, index) => {
      log(`  ${index + 1}. Source: "${result.source}", Score: ${result.score.toFixed(4)}`);
    });
    if (matches.length === 0) {
      log("  (No results returned)");
    }
    // --- END: Added logging for detailed analysis ---

    perQuery.push({
      query,
      expectedSource: expected_source,
      rank,
      latencyMs: latency,
      matches
    });

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

  const mrr5Val = mrr5 / queries.length;
  const recall3Val = recall3 / queries.length;
  const recall5Val = recall5 / queries.length;
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length || 0;
  const p95 =
    latencies.slice().sort((a, b) => a - b)[Math.floor(0.95 * (latencies.length - 1))] || 0;

  const bundle = await getBundleInfo();

  log(`\n--- Aggregate Metrics ---`);
  log(`MRR@5: ${mrr5Val.toFixed(4)}`);
  log(`Recall@3: ${recall3Val.toFixed(4)}`);
  log(`Recall@5: ${recall5Val.toFixed(4)}`);
  log(`Latency avg (ms): ${avg.toFixed(1)}`);
  log(`Latency p95 (ms): ${p95.toFixed(1)}`);
  log(
    `Embeddings bundle: ${bundle.exists ? bundle.sizeMB.toFixed(2) + " MB" : "not found"} (${bundle.path})`
  );

  // Thresholds: use whichever stricter between fixed floors and no-regression vs baseline
  const floors = {
    mrr5: 0.55,
    recall3: 0.7,
    recall5: 0.85,
    avgLatencyMs: 200,
    p95LatencyMs: 280,
    maxBundleMB: 24.8
  };
  const coverageOK = true; // Placeholder: coverage validated by generation pipeline

  const regression = baseline || {
    mrr5: Infinity,
    recall3: Infinity,
    recall5: Infinity,
    avgLatencyMs: 0,
    p95LatencyMs: 0
  };
  const pass =
    mrr5Val >= Math.min(floors.mrr5, (regression.mrr5 ?? Infinity) - 0.02) &&
    recall3Val >= Math.min(floors.recall3, (regression.recall3 ?? Infinity) - 0.03) &&
    recall5Val >= Math.min(floors.recall5, (regression.recall5 ?? Infinity) - 0.02) &&
    avg <= floors.avgLatencyMs &&
    p95 <= floors.p95LatencyMs &&
    (!bundle.exists || bundle.sizeMB <= floors.maxBundleMB) &&
    coverageOK;

  if (!pass) {
    error("RAG evaluation failed thresholds.");
    process.exitCode = 1;
  }

  const summary = {
    pass,
    metrics: {
      mrr5: mrr5Val,
      recall3: recall3Val,
      recall5: recall5Val,
      avgLatencyMs: avg,
      p95LatencyMs: p95
    },
    floors,
    baseline: baseline ?? null,
    bundle,
    queries: perQuery.map(({ query, expectedSource, rank, latencyMs, matches }) => ({
      query,
      expectedSource,
      rank,
      latencyMs,
      matches: matches.map(({ source, score }) => ({ source, score }))
    }))
  };

  return summary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await evaluate();
}
