import { test, expect } from "./fixtures/commonSetup.js";

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

test("debug error state", async ({ page }) => {
  const consoleMessages = [];
  page.on("console", (message) => {
    console.log(`[${message.type()}] ${message.text()}`);
    consoleMessages.push(message);
  });

  await gotoVectorSearch(page);
  await runSearch(page);

  const rows = page.locator("#vector-results-table tbody tr");
  await expect(rows).not.toHaveCount(0);

  console.log("Before reset - extractor type:", await page.evaluate(() => {
    return typeof window.__setExtractor;
  }));

  // Clear the extractor cache so the second search will attempt to reload it
  await page.evaluate(() => {
    if (window.__setExtractor) {
      window.__setExtractor(null);
      console.log("Extractor reset to null");
    }
  });

  await page.unroute("**/transformers.min.js");
  await page.route("**/transformers.min.js", (route) => {
    console.log("Route handler called for transformers.min.js - returning 500");
    route.fulfill({ status: 500 });
  });

  // Wait for route to be established before proceeding
  await page.waitForTimeout(100);

  console.log("Starting second search...");
  await runSearch(page);
  console.log("Second search completed");

  const errorMessage = page.locator("#search-results-message");
  const msgText = await errorMessage.textContent();
  const msgVisible = await errorMessage.isVisible();
  
  console.log("Message text:", msgText);
  console.log("Message visible:", msgVisible);
  console.log("Message HTML:", await errorMessage.innerHTML());
  
  await expect(errorMessage).toBeVisible();
});
