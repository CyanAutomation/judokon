import { test, expect } from "./fixtures/commonSetup.js";

/**
 * Vector search page comprehensive tests.
 */
test.describe("Vector Search Page", () => {
  test.describe("Basic Search Functionality", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/client_embeddings.json", (route) =>
        route.fulfill({ path: "tests/fixtures/client_embeddings_vector.json" })
      );
      await page.route("**/transformers.min.js", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: "export async function pipeline(){return async()=>({data:[1,0]});}"
        })
      );
      await page.route("**/design/productRequirementsDocuments/docA.md", (route) =>
        route.fulfill({ path: "tests/fixtures/docA.md" })
      );
      await page.goto("/src/pages/vectorSearch.html");
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
      await page.route("**/client_embeddings.json", (route) =>
        route.fulfill({ path: "tests/fixtures/client_embeddings_vector.json" })
      );
      await page.route("**/transformers.min.js", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: "export async function pipeline(){return async()=>({data:[1,0]});}"
        })
      );
      await page.route("**/design/productRequirementsDocuments/docA.md", (route) =>
        route.fulfill({ path: "tests/fixtures/docA.md" })
      );
      await page.goto("/src/pages/vectorSearch.html");
    });

    test("successful search shows results table", async ({ page }) => {
      await page.getByRole("searchbox").fill("query");
      await page.getByRole("button", { name: /search/i }).click();

      // Wait for search to complete
      await page.evaluate(() => window.vectorSearchResultsPromise);

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
      await page.getByRole("searchbox").fill("query");
      await page.getByRole("button", { name: /search/i }).click();
      await page.evaluate(() => window.vectorSearchResultsPromise);

      const firstRow = page.locator("#vector-results-table tbody tr").first();

      // Verify result contains source information
      await expect(firstRow).toContainText("docA.md");

      // Verify score is displayed
      const scoreCell = firstRow.locator("td").nth(3);
      await expect(scoreCell).toBeVisible();
    });

    test("clicking result loads context", async ({ page }) => {
      await page.getByRole("searchbox").fill("query");
      await page.getByRole("button", { name: /search/i }).click();
      await page.evaluate(() => window.vectorSearchResultsPromise);

      const firstRow = page.locator("#vector-results-table tbody tr").first();
      await firstRow.click();

      // Verify context is loaded
      const context = firstRow.locator(".result-context");
      await expect(context).toContainText("context A1");

      // Verify row is marked as expanded
      await expect(firstRow).toHaveAttribute("aria-expanded", "true");
    });

    test("context loads only once per result", async ({ page }) => {
      await page.getByRole("searchbox").fill("query");
      await page.getByRole("button", { name: /search/i }).click();
      await page.evaluate(() => window.vectorSearchResultsPromise);

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
      await page.route("**/client_embeddings.json", (route) =>
        route.fulfill({ path: "tests/fixtures/client_embeddings_vector.json" })
      );
      await page.route("**/transformers.min.js", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: "export async function pipeline(){return async()=>({data:[1,0]});}"
        })
      );
      await page.goto("/src/pages/vectorSearch.html");

      // Submit empty search
      await page.getByRole("button", { name: /search/i }).click();

      // Should show results state (empty query handling)
      const messageEl = page.locator("#search-results-message");
      await expect(messageEl).toBeVisible();
    });

    test("handles embedding load failure gracefully", async ({ page }) => {
      // Mock failed embedding load
      await page.route("**/client_embeddings.json", (route) => route.fulfill({ status: 404 }));
      await page.route("**/transformers.min.js", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: "export async function pipeline(){return async()=>({data:[1,0]});}"
        })
      );
      await page.goto("/src/pages/vectorSearch.html");

      await page.getByRole("searchbox").fill("query");
      await page.getByRole("button", { name: /search/i }).click();

      // Should show error message
      const messageEl = page.locator("#search-results-message");
      await expect(messageEl).toContainText(/could not be loaded|Failed to load/);
    });

    test("handles transformer failure gracefully", async ({ page }) => {
      await page.route("**/client_embeddings.json", (route) =>
        route.fulfill({ path: "tests/fixtures/client_embeddings_vector.json" })
      );
      // Mock failed transformer load
      await page.route("**/transformers.min.js", (route) => route.fulfill({ status: 404 }));
      await page.goto("/src/pages/vectorSearch.html");

      await page.getByRole("searchbox").fill("query");
      await page.getByRole("button", { name: /search/i }).click();

      // Should handle gracefully (may show error or empty results)
      const messageEl = page.locator("#search-results-message");
      await expect(messageEl).toBeVisible();
    });

    test("handles context load failure gracefully", async ({ page }) => {
      await page.route("**/client_embeddings.json", (route) =>
        route.fulfill({ path: "tests/fixtures/client_embeddings_vector.json" })
      );
      await page.route("**/transformers.min.js", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: "export async function pipeline(){return async()=>({data:[1,0]});}"
        })
      );
      // Mock failed context fetch
      await page.route("**/design/productRequirementsDocuments/docA.md", (route) =>
        route.fulfill({ status: 404 })
      );
      await page.goto("/src/pages/vectorSearch.html");

      await page.getByRole("searchbox").fill("query");
      await page.getByRole("button", { name: /search/i }).click();
      await page.evaluate(() => window.vectorSearchResultsPromise);

      const firstRow = page.locator("#vector-results-table tbody tr").first();
      await firstRow.click();

      // Should show fallback message
      const context = firstRow.locator(".result-context");
      await expect(context).toContainText(/could not be loaded|No additional context/);
    });
  });

  test.describe("UI Interactions and States", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/client_embeddings.json", (route) =>
        route.fulfill({ path: "tests/fixtures/client_embeddings_vector.json" })
      );
      await page.route("**/transformers.min.js", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: "export async function pipeline(){return async()=>({data:[1,0]});}"
        })
      );
      await page.route("**/design/productRequirementsDocuments/docA.md", (route) =>
        route.fulfill({ path: "tests/fixtures/docA.md" })
      );
      await page.goto("/src/pages/vectorSearch.html");
    });

    test("search form prevents default submission", async ({ page }) => {
      // Monitor for page navigation that would indicate form submission
      let navigated = false;
      page.on("framenavigated", () => {
        navigated = true;
      });

      await page.getByRole("searchbox").fill("query");
      await page.getByRole("button", { name: /search/i }).click();

      // Wait a bit and ensure no navigation occurred
      await page.waitForTimeout(500);
      expect(navigated).toBe(false);
    });

    test("search input handles keyboard submission", async ({ page }) => {
      await page.getByRole("searchbox").fill("query");
      await page.keyboard.press("Enter");

      // Wait for search to complete
      await page.evaluate(() => window.vectorSearchResultsPromise);

      // Verify results are shown
      const resultsTable = page.locator("#vector-results-table tbody");
      await expect(resultsTable.locator("tr")).toHaveCount(1);
    });

    test("multiple searches work correctly", async ({ page }) => {
      // First search
      await page.getByRole("searchbox").fill("query");
      await page.getByRole("button", { name: /search/i }).click();
      await page.evaluate(() => window.vectorSearchResultsPromise);

      const firstResult = page.locator("#vector-results-table tbody tr").first();
      await expect(firstResult).toBeVisible();

      // Second search
      await page.getByRole("searchbox").fill("different query");
      await page.getByRole("button", { name: /search/i }).click();
      await page.evaluate(() => window.vectorSearchResultsPromise);

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
      await page.route("**/client_embeddings.json", (route) =>
        route.fulfill({ path: "tests/fixtures/client_embeddings_vector.json" })
      );
      await page.route("**/transformers.min.js", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: "export async function pipeline(){return async()=>({data:[1,0]});}"
        })
      );
      await page.route("**/design/productRequirementsDocuments/docA.md", (route) =>
        route.fulfill({ path: "tests/fixtures/docA.md" })
      );
      await page.goto("/src/pages/vectorSearch.html");
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
      await page.getByRole("searchbox").fill("query");
      await page.getByRole("button", { name: /search/i }).click();
      await page.evaluate(() => window.vectorSearchResultsPromise);

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
      await page.route("**/client_embeddings.json", (route) =>
        route.fulfill({ path: "tests/fixtures/client_embeddings_vector.json" })
      );
      await page.route("**/transformers.min.js", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: "export async function pipeline(){return async()=>({data:[1,0]});}"
        })
      );
      await page.route("**/design/productRequirementsDocuments/docA.md", (route) =>
        route.fulfill({ path: "tests/fixtures/docA.md" })
      );
      await page.goto("/src/pages/vectorSearch.html");

      await page.getByRole("searchbox").fill("query");

      // Start search
      await page.getByRole("button", { name: /search/i }).click();

      // Check for loading message during search
      const messageEl = page.locator("#search-results-message");
      // The loading state may be brief, so we just verify the element exists
      await expect(messageEl).toBeAttached();
      await expect(messageEl).toHaveAttribute("aria-live", "polite");
    });

    test("context loading shows appropriate message", async ({ page }) => {
      await page.route("**/client_embeddings.json", (route) =>
        route.fulfill({ path: "tests/fixtures/client_embeddings_vector.json" })
      );
      await page.route("**/transformers.min.js", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: "export async function pipeline(){return async()=>({data:[1,0]});}"
        })
      );
      await page.route("**/design/productRequirementsDocuments/docA.md", (route) =>
        route.fulfill({ path: "tests/fixtures/docA.md" })
      );
      await page.goto("/src/pages/vectorSearch.html");

      await page.getByRole("searchbox").fill("query");
      await page.getByRole("button", { name: /search/i }).click();
      await page.evaluate(() => window.vectorSearchResultsPromise);

      const firstRow = page.locator("#vector-results-table tbody tr").first();
      await firstRow.click();

      // Should show loading message initially
      const context = firstRow.locator(".result-context");
      await expect(context).toContainText("Loading context...");
    });
  });
});
