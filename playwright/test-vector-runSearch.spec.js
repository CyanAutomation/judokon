import { test, expect } from "./fixtures/commonSetup.js";

const TEST_QUERY = "alpha";
const EMBEDDINGS_FIXTURE = "tests/fixtures/client_embeddings_vector.json";
const TRANSFORMER_STUB = "export async function pipeline(){return async()=>({ data:[1,1]});}";
const VECTOR_RESULTS_TIMEOUT = 5_000;

async function stubVectorSearch(page) {
  await page.route("**/client_embeddings.json", (route) => {
    return route.fulfill({ path: EMBEDDINGS_FIXTURE });
  });
  await page.route("**/transformers.min.js", (route) => {
    return route.fulfill({ contentType: "application/javascript", body: TRANSFORMER_STUB });
  });
  await page.route("**/design/productRequirementsDocuments/docA.md", (route) =>
    route.fulfill({ path: "tests/fixtures/docA.md" })
  );
}

async function runSearch(page, query = TEST_QUERY) {
  console.log("runSearch: filling search box");
  await page.getByRole("searchbox").fill(query);
  console.log("runSearch: clicking search button");
  await page.getByRole("button", { name: /search/i }).click();
  console.log("runSearch: waiting for promise to exist");
  await page.waitForFunction(() => window.vectorSearchResultsPromise, {
    timeout: VECTOR_RESULTS_TIMEOUT
  });
  console.log("runSearch: promise exists, now awaiting it");
  await page.evaluate((timeoutMs) => {
    const { vectorSearchResultsPromise } = window;
    if (!vectorSearchResultsPromise?.then) {
      throw new Error("vectorSearchResultsPromise was not set by the app");
    }

    return Promise.race([
      vectorSearchResultsPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Vector search did not resolve in time")), timeoutMs)
      )
    ]).catch((error) => {
      if (error.message.includes("did not resolve in time")) {
        console.warn("Vector search timed out, but test will continue");
        return;
      }
      throw error;
    });
  }, VECTOR_RESULTS_TIMEOUT);
  console.log("runSearch: completed");
}

test("test with runSearch function", async ({ page }) => {
  await stubVectorSearch(page);
  await page.goto("/src/pages/vectorSearch.html");
  
  console.log("Starting first search");
  await runSearch(page);
  console.log("First search completed");
  
  const rows = page.locator("#vector-results-table tbody tr");
  await expect(rows).not.toHaveCount(0);
  
  await page.evaluate(() => {
    console.log("Setting throwing extractor");
    if (window.__setExtractor) {
      window.__setExtractor(async () => {
        console.log("Throwing extractor called");
        throw new Error("Model failed to load");
      });
    }
  });
  
  console.log("Starting second search");
  await runSearch(page);
  console.log("Second search completed");
  
  const errorMessage = page.locator("#search-results-message");
  await expect(errorMessage).toBeVisible();
  console.log("Test passed");
});
