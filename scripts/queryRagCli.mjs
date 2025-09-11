/**
 * CLI helper to query the vector database.
 *
 * @pseudocode
 * 1. Read a prompt from command line arguments.
 * 2. Use `queryRag` to find relevant matches.
 * 3. Print each match summary (`qaContext` or `text`).
 * 4. Exit with code 1 if no prompt is provided.
 */
import queryRag from "../src/helpers/queryRag.js";

(async function main() {
  const prompt = process.argv.slice(2).join(" ").trim();
  if (!prompt) {
    console.error("Usage: node scripts/queryRagCli.mjs <prompt>");
    process.exit(1);
  }
  let matches;
  try {
    matches = await queryRag(prompt);
  } catch (err) {
    console.error("RAG query failed:", err);
    const lowered = String(err?.message || err).toLowerCase();
    if (lowered.includes("strict offline mode")) {
      console.error(
        "Hint: provide a local MiniLM at src/models/minilm or run: npm run rag:prepare:models"
      );
    } else if (
      /enet(?:unreach|down|reset|refused)/i.test(lowered) ||
      lowered.includes("fetch failed")
    ) {
      console.error(
        "Hint: network unreachable. For offline use, run: npm run rag:prepare:models -- --from-dir <path-with-minilm> " +
          "or set RAG_STRICT_OFFLINE=1 to avoid CDN attempts. Optionally set RAG_ALLOW_LEXICAL_FALLBACK=1 to degrade gracefully."
      );
    }
    process.exit(1);
    return;
  }
  if (!matches || matches.length === 0) {
    console.log("No matches found.");
    return;
  }
  for (const { qaContext, text } of matches) {
    console.log(`- ${qaContext || text || "(no summary)"}`);
  }
})();
