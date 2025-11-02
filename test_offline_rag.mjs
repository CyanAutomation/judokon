import { queryRag } from "./src/helpers/queryRag.js";

async function testOfflineRag() {
  try {
    console.log("Testing RAG in offline mode...");
    const results = await queryRag("what is the battle engine?", { withProvenance: true });
    if (results && results.length > 0) {
      console.log("Offline RAG query successful!");
      console.log("Results:", JSON.stringify(results.slice(0, 2), null, 2));
    } else {
      console.error("Offline RAG query returned no results.");
    }
  } catch (error) {
    console.error("Offline RAG query failed:");
    console.error(error);
  }
}

testOfflineRag();
