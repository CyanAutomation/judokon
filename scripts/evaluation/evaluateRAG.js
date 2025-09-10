/* eslint-env node */
import { readFile } from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "node:url";
import queryRag from "../../src/helpers/queryRag.js"; // New import

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

// Removed STOP_WORDS and createSparseVector as queryRag handles it

export async function evaluate() {
  const queriesPath = path.join(rootDir, "scripts/evaluation/queries.json");
  const queries = JSON.parse(await readFile(queriesPath, "utf8"));

  let mrr5 = 0;
  let recall3 = 0;
  let recall5 = 0;

  for (const { query, expected_source } of queries) {
    // Use the centralized queryRag function
    const results = await queryRag(query);

    let rank = 0;
    for (let i = 0; i < results.length; i++) {
      // queryRag returns matches with a 'source' property
      if (results[i].source.startsWith(expected_source)) {
        rank = i + 1;
        break;
      }
    }

    // --- START: Added logging for detailed analysis ---
    console.log(`\n--- Query: "${query}" ---`);
    console.log(`Expected Source: "${expected_source}"`);
    console.log(`Rank Found: ${rank > 0 ? rank : "Not Found"}`);
    console.log("Top Results:");
    results.slice(0, 3).forEach((result, index) => {
      console.log(`  ${index + 1}. Source: "${result.source}", Score: ${result.score.toFixed(4)}`);
    });
    if (results.length === 0) {
      console.log("  (No results returned)");
    }
    // --- END: Added logging for detailed analysis ---

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

  console.log(`\n--- Aggregate Metrics ---`);
  console.log(`MRR@5: ${mrr5 / queries.length}`);
  console.log(`Recall@3: ${recall3 / queries.length}`);
  console.log(`Recall@5: ${recall5 / queries.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await evaluate();
}
