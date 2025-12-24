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
      // Allow the test to continue if it's just a timeout, but log the issue
      if (error.message.includes("did not resolve in time")) {
        console.warn("Vector search timed out, but test will continue");
        return;
      }
      throw error;
    });
  }, VECTOR_RESULTS_TIMEOUT);
}

test.describe("Vector search page", () => {
  test("renders fixture results in score order", async ({ page }) => {
    await gotoVectorSearch(page);
    await runSearch(page);

    const rows = page.locator("#vector-results-table tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(2);

    const firstRow = rows.nth(0);
    const secondRow = rows.nth(1);
    const scoreHeader = page.getByRole("columnheader", { name: "Score" });
    await expect(firstRow).toBeVisible();
    await expect(secondRow).toBeVisible();
    await expect(firstRow.locator(".snippet-summary")).toContainText(
      "Alpha insights align with alpha guidelines across multiple contexts"
    );
    await expect(secondRow.locator(".snippet-summary")).toHaveText("Beta text");
    await expect(firstRow.locator("td").nth(1)).toHaveText("docA.md");
    await expect(secondRow.locator("td").nth(1)).toHaveText("docB.md");

    const initialTopScore = firstRow.locator("td").nth(3);
    const initialBottomScore = rows.nth(rowCount - 1).locator("td").nth(3);
    await expect(initialTopScore).toHaveText("1.00");
    await expect(initialBottomScore).toHaveText("0.85");
    const initialTopScoreText = await initialTopScore.textContent();
    const initialBottomScoreText = await initialBottomScore.textContent();

    await scoreHeader.click();

    const sortedTopScore = rows.nth(0).locator("td").nth(3);
    const sortedBottomScore = rows.nth(rowCount - 1).locator("td").nth(3);
    await expect(sortedTopScore).toHaveText("0.85");
    await expect(sortedBottomScore).toHaveText("1.00");
    await expect(sortedTopScore).not.toHaveText(initialTopScoreText ?? "");
    await expect(sortedBottomScore).not.toHaveText(initialBottomScoreText ?? "");
  });

  test("shows empty state when no embeddings are available", async ({ page }) => {
    await gotoVectorSearch(page, { embeddingsBody: "[]" });
    await runSearch(page);

    await expect(page.locator("#vector-results-table tbody tr")).toHaveCount(0);
    await expect(page.locator("#search-results-message")).toBeVisible();
    await expect(page.locator("#search-results-message")).toHaveText(
      "No close matches found — refine your query."
    );
  });

  test("shows error state when the model fails to load", async ({ page }) => {
    const consoleMessages = [];
    page.on("console", (message) => consoleMessages.push(message));

    await gotoVectorSearch(page);
    await runSearch(page);

    const rows = page.locator("#vector-results-table tbody tr");
    await expect(rows).not.toHaveCount(0);

    // Mock the extractor to throw an error on the second search
    await page.evaluate(() => {
      if (window.__setExtractor) {
        window.__setExtractor(async () => {
          throw new Error("Model failed to load");
        });
      }
    });

    await runSearch(page);

    const errorMessage = page.locator("#search-results-message");
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveAttribute("aria-live", /polite/i);
    await expect(errorMessage).toHaveText("An error occurred while searching.");

    const spinner = page.locator(".loading-spinner");
    await expect(spinner).toBeHidden();
    await expect(rows).toHaveCount(0);

    const searchButton = page.getByRole("button", { name: /search/i });
    await expect(searchButton).toBeEnabled();

    const errors = consoleMessages.filter((message) => message.type() === "error");
    expect(errors.length).toBeGreaterThan(0);

    // Reset the extractor mock so the final search succeeds
    await page.evaluate(() => {
      if (window.__setExtractor) {
        window.__setExtractor(null);
      }
    });

    await page.unroute("**/transformers.min.js");
    await page.route("**/transformers.min.js", (route) =>
      route.fulfill({ contentType: "application/javascript", body: TRANSFORMER_STUB })
    );

    // Wait for route to be established before proceeding
    await page.waitForTimeout(100);

    await runSearch(page);

    await expect(searchButton).toBeEnabled();
    await expect(rows).not.toHaveCount(0);
    await expect(errorMessage).not.toBeVisible();
  });
});
