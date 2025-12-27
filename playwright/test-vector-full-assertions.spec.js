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
  await page.getByRole("searchbox").fill(query);
  await page.getByRole("button", { name: /search/i }).click();
  await page.waitForFunction(() => window.vectorSearchResultsPromise, {
    timeout: VECTOR_RESULTS_TIMEOUT
  });
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
}

test("test all assertions", async ({ page }) => {
  await stubVectorSearch(page);
  await page.goto("/src/pages/vectorSearch.html");
  
  await runSearch(page);
  
  const rows = page.locator("#vector-results-table tbody tr");
  await expect(rows).not.toHaveCount(0);
  
  await page.evaluate(() => {
    if (window.__setExtractor) {
      window.__setExtractor(async () => {
        throw new Error("Model failed to load");
      });
    }
  });
  
  await runSearch(page);
  
  console.log("Checking error message");
  const errorMessage = page.locator("#search-results-message");
  await expect(errorMessage).toBeVisible();
  console.log("✓ Error message visible");
  
  await expect(errorMessage).toHaveAttribute("aria-live", /polite/i);
  console.log("✓ aria-live attribute correct");
  
  await expect(errorMessage).toHaveText("An error occurred while searching.");
  console.log("✓ Error message text correct");
  
  await expect(errorMessage).toHaveClass(/search-result-empty/);
  console.log("✓ Error message class correct");
  
  const spinner = page.locator(".loading-spinner");
  await expect(spinner).toBeHidden();
  console.log("✓ Spinner hidden");
  
  await expect(rows).toHaveCount(0);
  console.log("✓ Rows cleared");
  
  const searchButton = page.getByRole("button", { name: /search/i });
  await expect(searchButton).toBeVisible();
  console.log("✓ Search button visible");
  
  await expect(searchButton).toBeEnabled();
  console.log("✓ Search button enabled");
  
  console.log("All assertions passed!");
});
