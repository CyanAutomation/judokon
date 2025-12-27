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

test("test with recovery section", async ({ page }) => {
  await stubVectorSearch(page);
  await page.goto("/src/pages/vectorSearch.html");
  
  console.log("=== First search ===");
  await runSearch(page);
  
  const rows = page.locator("#vector-results-table tbody tr");
  await expect(rows).not.toHaveCount(0);
  
  console.log("=== Setting throwing extractor ===");
  await page.evaluate(() => {
    if (window.__setExtractor) {
      window.__setExtractor(async () => {
        throw new Error("Model failed to load");
      });
    }
  });
  
  console.log("=== Second search (should error) ===");
  await runSearch(page);
  
  const errorMessage = page.locator("#search-results-message");
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toHaveAttribute("aria-live", /polite/i);
  await expect(errorMessage).toHaveText("An error occurred while searching.");
  await expect(errorMessage).toHaveClass(/search-result-empty/);
  
  const spinner = page.locator(".loading-spinner");
  await expect(spinner).toBeHidden();
  await expect(rows).toHaveCount(0);
  
  const searchButton = page.getByRole("button", { name: /search/i });
  await expect(searchButton).toBeVisible();
  await expect(searchButton).toBeEnabled();
  
  console.log("=== Resetting extractor ===");
  await page.evaluate(() => {
    if (window.__setExtractor) {
      window.__setExtractor(null);
    }
  });
  
  console.log("=== Setting up routes for recovery ===");
  await page.unroute("**/transformers.min.js");
  let resolveTransformerRoute;
  const transformerRoutePromise = new Promise((resolve) => {
    resolveTransformerRoute = resolve;
  });
  await page.route("**/transformers.min.js", (route) =>
    route
      .fulfill({ contentType: "application/javascript", body: TRANSFORMER_STUB })
      .finally(() => resolveTransformerRoute())
  );
  
  console.log("=== Triggering route ===");
  await page.evaluate(() => fetch(""));
  console.log("=== Waiting for route promise ===");
  await transformerRoutePromise;
  
  console.log("=== Third search (should succeed) ===");
  await runSearch(page);
  
  await expect(searchButton).toBeEnabled();
  await expect(rows).not.toHaveCount(0);
  await expect(errorMessage).not.toBeVisible();
  
  console.log("=== Test complete ===");
});
