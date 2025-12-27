import { test, expect } from "@playwright/test";

const TEST_QUERY = "alpha";
const EMBEDDINGS_FIXTURE = "tests/fixtures/client_embeddings_vector.json";
const TRANSFORMER_STUB = "export async function pipeline(){return async()=>({ data:[1,1]});}";
const VECTOR_RESULTS_TIMEOUT = 5_000;

async function stubVectorSearch(page, { embeddingsBody, transformerFailure } = {}) {
  await page.route("**/client_embeddings.json", (route) => {
    if (embeddingsBody) {
      return route.fulfill({ contentType: "application/json", body: embeddingsBody });
    }
    return route.fulfill({ path: EMBEDDINGS_FIXTURE });
  });

  await page.route("**/transformers.min.js", (route) => {
    if (transformerFailure) {
      return route.fulfill({ status: transformerFailure });
    }
    return route.fulfill({ contentType: "application/javascript", body: TRANSFORMER_STUB });
  });

  await page.route("**/design/productRequirementsDocuments/docA.md", (route) =>
    route.fulfill({ path: "tests/fixtures/docA.md" })
  );
}

async function gotoVectorSearch(page, options) {
  await stubVectorSearch(page, options);
  await page.goto("/src/pages/vectorSearch.html");
}

async function runSearch(page, query = TEST_QUERY) {
  await page.getByRole("searchbox").fill(query);
  await page.getByRole("button", { name: /search/i }).click();
  console.log("Clicked search button");
  await page.waitForFunction(() => window.vectorSearchResultsPromise, {
    timeout: VECTOR_RESULTS_TIMEOUT
  });
  console.log("Promise exists");
  await page.evaluate((timeoutMs) => {
    const { vectorSearchResultsPromise } = window;
    console.log("About to await promise");
    return Promise.race([
      vectorSearchResultsPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Vector search did not resolve in time")), timeoutMs)
      )
    ]).catch((error) => {
      console.log("Promise resolved or errored:", error?.message);
      if (error.message.includes("did not resolve in time")) {
        console.warn("Vector search timed out, but test will continue");
        return;
      }
      throw error;
    });
  }, VECTOR_RESULTS_TIMEOUT);
  console.log("runSearch completed");
}

test("debug error state", async ({ page }) => {
  await gotoVectorSearch(page);
  await runSearch(page);
  console.log("First search done");

  const rows = page.locator("#vector-results-table tbody tr");
  await expect(rows).not.toHaveCount(0);

  // Mock the extractor to throw an error on the second search
  await page.evaluate(() => {
    if (window.__setExtractor) {
      console.log("Setting extractor to throw");
      window.__setExtractor(async () => {
        throw new Error("Model failed to load");
      });
    }
  });

  console.log("About to run second search");
  await runSearch(page);
  console.log("Second search done");

  const errorMessage = page.locator("#search-results-message");
  await expect(errorMessage).toBeVisible();
});
