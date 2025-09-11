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
    if (
      String(err?.message || err)
        .toLowerCase()
        .includes("strict offline mode")
    ) {
      console.error("Hint: provide a local MiniLM at src/models/minilm or run: npm run rag:prepare:models");
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
