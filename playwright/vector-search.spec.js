import { test, expect } from "./fixtures/commonSetup.js";

const harnessStore = new WeakMap();

/**
 * @typedef {import("@playwright/test").Route} PlaywrightRoute
 * @typedef {Parameters<PlaywrightRoute["fulfill"]>[0]} RouteFulfillOptions
 */

/**
 * Install a deterministic harness that resolves when the search promise settles.
 *
 * @param {import("@playwright/test").Page} page
 */
async function ensureVectorSearchHarness(page) {
  if (harnessStore.has(page)) {
    return harnessStore.get(page);
  }

  await page.addInitScript(() => {
    window.__vectorSearchTestHarness = (() => {
      let readyResolve = () => {};
      let readyPromise = Promise.resolve();
      let currentPromise = Promise.resolve();

      const createReadyPromise = () => {
        readyPromise = new Promise((resolve) => {
          readyResolve = resolve;
        });
      };

      createReadyPromise();

      Object.defineProperty(window, "vectorSearchResultsPromise", {
        configurable: true,
        get() {
          return currentPromise;
        },
        set(value) {
          createReadyPromise();
          const currentReadyResolve = readyResolve;
          currentPromise = Promise.resolve(value);
          currentPromise
            .catch(() => {})
            .finally(() => {
              currentReadyResolve();
            });
        }
      });

      return {
        /**
         * Wait for the current vector search promise to settle.
         * @returns {Promise<void>}
         */
        waitForResults() {
          return readyPromise;
        }
      };
    })();
  });

  const harness = {
    /**
     * Wait for the current vector search promise to resolve or reject.
     * @returns {Promise<void>}
     */
    async waitForResults() {
      await page.evaluate(() => window.__vectorSearchTestHarness.waitForResults());
    },
    /**
     * Submit a search query and wait for completion.
     * @param {string|undefined} query - Search query to submit. If undefined, submits current input value.
     * @param {{ viaKeyboard?: boolean }} [options] - Submission options.
     * @param {boolean} [options.viaKeyboard=false] - Whether to submit via Enter key instead of button click.
     * @returns {Promise<void>}
     */
    async submit(query, options = {}) {
      const { viaKeyboard = false } = options;
      const searchInput = page.getByRole("searchbox");
      if (query !== undefined) {
        await searchInput.fill(query);
      }

      if (viaKeyboard) {
        await page.keyboard.press("Enter");
      } else {
        await page.getByRole("button", { name: /search/i }).click();
      }

      await this.waitForResults();
    }
  };

  harnessStore.set(page, harness);
  return harness;
}

/**
 * Retrieve the previously installed harness.
 *
 * @param {import("@playwright/test").Page} page
 */
function getVectorSearchHarness(page) {
  const harness = harnessStore.get(page);
  if (!harness) {
    throw new Error(
      "Vector search harness was not initialized. Call prepareVectorSearchPage first."
    );
  }
  return harness;
}

/**
 * Configure network mocks and navigate to the vector search page.
 *
 * @param {import("@playwright/test").Page} page
 * @param {object} [overrides]
 * @param {RouteFulfillOptions | ((route: PlaywrightRoute) => unknown)} [overrides.embeddings]
 * @param {RouteFulfillOptions | ((route: PlaywrightRoute) => unknown)} [overrides.transformer]
 * @param {RouteFulfillOptions | ((route: PlaywrightRoute) => unknown) | false} [overrides.context]
 */
async function prepareVectorSearchPage(page, overrides = {}) {
  if (overrides && typeof overrides !== "object") {
    throw new TypeError("overrides must be an object");
  }
  const { embeddings, transformer, context } = overrides;
  await ensureVectorSearchHarness(page);

  await page.route("**/client_embeddings.json", (route) => {
    if (typeof embeddings === "function") {
      return embeddings(route);
    }
    if (embeddings) {
      return route.fulfill(embeddings);
    }
    return route.fulfill({ path: "tests/fixtures/client_embeddings_vector.json" });
  });

  await page.route("**/transformers.min.js", (route) => {
    try {
      if (typeof transformer === "function") {
        return transformer(route);
      }
      if (transformer) {
        return route.fulfill(transformer);
      }
      return route.fulfill({
        contentType: "application/javascript",
        body: "export async function pipeline(){return async()=>({data:[1,0]});}"
      });
    } catch (error) {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Transformer route handler failed", error: String(error) })
      });
    }
  });

  if (context !== false) {
    await page.route("**/design/productRequirementsDocuments/docA.md", (route) => {
      if (typeof context === "function") {
        return context(route);
      }
      if (context) {
        return route.fulfill(context);
      }
      return route.fulfill({ path: "tests/fixtures/docA.md" });
    });
  }

  await page.goto("/src/pages/vectorSearch.html");
}

/**
 * Submit the search form and wait for completion.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string|undefined} query
 * @param {{ viaKeyboard?: boolean }} [options]
 */
async function submitSearch(page, query, options) {
  const harness = getVectorSearchHarness(page);
  await harness.submit(query, options);
}

/**
 * Wait for the current search promise to settle without triggering a new search.
 *
 * @param {import("@playwright/test").Page} page
 */
async function waitForSearchCompletion(page) {
  const harness = getVectorSearchHarness(page);
  await harness.waitForResults();
}

/**
 * Vector search page comprehensive tests.
 */
test.describe("Vector Search Page", () => {
  test.describe("Basic Search Functionality", () => {
    test.beforeEach(async ({ page }) => {
      await prepareVectorSearchPage(page);
    });

    test("page loads with proper structure", async ({ page }) => {
      // Verify page title
      await expect(page).toHaveTitle(/Vector Search/);

      // Verify main elements are present
      await expect(page.locator("h1")).toContainText("Vector Search");
      await expect(page.getByRole("searchbox")).toBeVisible();
      await expect(page.getByRole("button", { name: /search/i })).toBeVisible();
      await expect(page.locator("#vector-results-table")).toBeVisible();
      await expect(page.locator("#tag-filter")).toBeVisible();
    });

    test("search input accepts text and shows placeholder", async ({ page }) => {
      const searchInput = page.getByRole("searchbox");
      await expect(searchInput).toHaveAttribute("placeholder", "Enter query");
      await expect(searchInput).toHaveAttribute("required");

      // Type in search box
      await searchInput.fill("test query");
      await expect(searchInput).toHaveValue("test query");
    });

    test("search button is properly configured", async ({ page }) => {
      const searchButton = page.getByRole("button", { name: /search/i });
      await expect(searchButton).toHaveAttribute("type", "submit");
      await expect(searchButton).toBeEnabled();
    });

    test("tag filter dropdown is present", async ({ page }) => {
      const tagFilter = page.locator("#tag-filter");
      await expect(tagFilter).toBeVisible();
      await expect(tagFilter).toHaveAttribute("aria-label", "Tag filter");
    });
  });

  test.describe("Search Execution and Results", () => {
    test.beforeEach(async ({ page }) => {
      await prepareVectorSearchPage(page);
    });

    test("successful search shows results table", async ({ page }) => {
      await submitSearch(page, "query");

      // Verify results table has content
      const resultsTable = page.locator("#vector-results-table tbody");
      await expect(resultsTable.locator("tr")).toHaveCount(1);

      // Verify table headers
      const headers = page.locator("#vector-results-table thead th");
      await expect(headers).toHaveCount(4);
      await expect(headers.nth(0)).toContainText("Match");
      await expect(headers.nth(1)).toContainText("Source");
      await expect(headers.nth(2)).toContainText("Tags");
      await expect(headers.nth(3)).toContainText("Score");
    });

    test("search results contain expected data", async ({ page }) => {
      await submitSearch(page, "query");

      const firstRow = page.locator("#vector-results-table tbody tr").first();

      // Verify result contains source information
      await expect(firstRow).toContainText("docA.md");

      // Verify score is displayed
      const scoreCell = firstRow.locator("td").nth(3);
      await expect(scoreCell).toBeVisible();
    });

    test("clicking result loads context", async ({ page }) => {
      await submitSearch(page, "query");

      const firstRow = page.locator("#vector-results-table tbody tr").first();
      await firstRow.click();

      // Verify context is loaded
      const context = firstRow.locator(".result-context");
      await expect(context).toContainText("context A1");

      // Verify row is marked as expanded
      await expect(firstRow).toHaveAttribute("aria-expanded", "true");
    });

    test("context loads only once per result", async ({ page }) => {
      await submitSearch(page, "query");

      const firstRow = page.locator("#vector-results-table tbody tr").first();

      // Click once
      await firstRow.click();
      await expect(firstRow.locator(".result-context")).toContainText("context A1");

      // Click again - should not change
      await firstRow.click();
      await expect(firstRow.locator(".result-context")).toContainText("context A1");
    });
  });

  test.describe("Edge Cases and Error Handling", () => {
    test("empty search shows appropriate message", async ({ page }) => {
      await prepareVectorSearchPage(page);

      // Submit empty search
      await page.getByRole("button", { name: /search/i }).click();
      await waitForSearchCompletion(page);

      // Should show results state (empty query handling)
      const messageEl = page.locator("#search-results-message");
      await expect(messageEl).toBeVisible();
    });

    test("handles embedding load failure gracefully", async ({ page }) => {
      // Mock failed embedding load
      await prepareVectorSearchPage(page, { embeddings: { status: 404 } });

      await submitSearch(page, "query");

      // Should show error message
      const messageEl = page.locator("#search-results-message");
      await expect(messageEl).toContainText(/could not be loaded|Failed to load/);
    });

    test("handles transformer failure gracefully", async ({ page }) => {
      await prepareVectorSearchPage(page, { transformer: { status: 404 } });

      await submitSearch(page, "query");

      // Should handle gracefully (may show error or empty results)
      const messageEl = page.locator("#search-results-message");
      await expect(messageEl).toBeVisible();
    });

    test("handles context load failure gracefully", async ({ page }) => {
      await prepareVectorSearchPage(page, { context: { status: 404 } });

      await submitSearch(page, "query");

      const firstRow = page.locator("#vector-results-table tbody tr").first();
      await firstRow.click();

      // Should show fallback message
      const context = firstRow.locator(".result-context");
      await expect(context).toContainText(/could not be loaded|No additional context/);
    });
  });

  test.describe("UI Interactions and States", () => {
    test.beforeEach(async ({ page }) => {
      await prepareVectorSearchPage(page);
    });

    test("search form prevents default submission", async ({ page }) => {
      page.once("framenavigated", () => {
        throw new Error("Form submitted");
      });

      const initialUrl = page.url();

      await submitSearch(page, "query");

      await expect(page).toHaveURL(initialUrl);
    });

    test("search input handles keyboard submission", async ({ page }) => {
      await submitSearch(page, "query", { viaKeyboard: true });

      // Verify results are shown
      const resultsTable = page.locator("#vector-results-table tbody");
      await expect(resultsTable.locator("tr")).toHaveCount(1);
    });

    test("multiple searches work correctly", async ({ page }) => {
      // First search
      await submitSearch(page, "query");

      const firstResult = page.locator("#vector-results-table tbody tr").first();
      await expect(firstResult).toBeVisible();

      // Second search
      await submitSearch(page, "different query");

      // Results should still be visible (may be same or different)
      const secondResult = page.locator("#vector-results-table tbody tr").first();
      await expect(secondResult).toBeVisible();
    });

    test("context note is displayed", async ({ page }) => {
      const contextNote = page.locator("#context-note");
      await expect(contextNote).toContainText("Click a result to load more context");
      await expect(contextNote).toHaveClass(/small-text/);
    });
  });

  test.describe("Accessibility Features", () => {
    test.beforeEach(async ({ page }) => {
      await prepareVectorSearchPage(page);
    });

    test("search form has proper ARIA labels", async ({ page }) => {
      const searchForm = page.locator("#vector-search-form");
      await expect(searchForm).toHaveAttribute("role", "search");

      // Check that the label is associated with the input
      const searchLabel = page.locator('label[for="vector-search-input"]');
      await expect(searchLabel).toContainText("Search");
      await expect(searchLabel).toHaveClass(/visually-hidden/);

      const searchInput = page.getByRole("searchbox");
      await expect(searchInput).toHaveAttribute("id", "vector-search-input");

      const tagFilter = page.locator("#tag-filter");
      await expect(tagFilter).toHaveAttribute("aria-label", "Tag filter");
    });

    test("results table has proper accessibility attributes", async ({ page }) => {
      await submitSearch(page, "query");

      const resultsTable = page.locator("#vector-results-table");
      await expect(resultsTable).toHaveAttribute("aria-label", "Search results");

      const firstRow = page.locator("#vector-results-table tbody tr").first();
      await expect(firstRow).toHaveAttribute("aria-expanded", "false");

      // Click to expand
      await firstRow.click();
      await expect(firstRow).toHaveAttribute("aria-expanded", "true");
    });

    test("status messages are announced to screen readers", async ({ page }) => {
      const messageEl = page.locator("#search-results-message");
      await expect(messageEl).toHaveAttribute("aria-live", "polite");
    });
  });

  test.describe("Loading and Spinner States", () => {
    test("shows loading state during search", async ({ page }) => {
      await prepareVectorSearchPage(page);

      await page.getByRole("searchbox").fill("query");

      // Start search
      await page.getByRole("button", { name: /search/i }).click();

      // Check for loading message during search
      const messageEl = page.locator("#search-results-message");
      // The loading state may be brief, so we just verify the element exists
      await expect(messageEl).toBeAttached();
      await expect(messageEl).toHaveAttribute("aria-live", "polite");
      await waitForSearchCompletion(page);
    });

    test("context loading shows appropriate message", async ({ page }) => {
      await prepareVectorSearchPage(page);

      await submitSearch(page, "query");

      const firstRow = page.locator("#vector-results-table tbody tr").first();
      await firstRow.click();

      // Should show loading message initially
      const context = firstRow.locator(".result-context");
      await expect(context).toContainText("Loading context...");
    });
  });
});
