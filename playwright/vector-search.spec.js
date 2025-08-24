import { test, expect } from "./fixtures/commonSetup.js";

/**
 * Vector search demo tests.
 */
test.describe.parallel("Vector search page", () => {
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

  test("selecting a result loads context", async ({ page }) => {
    await page.getByRole("searchbox").fill("query");
    await page.getByRole("button", { name: /search/i }).click();
    await page.evaluate(() => window.vectorSearchResultsPromise);
    const item = page.locator("#vector-results-table tbody tr").first();
    await item.click();
    const context = item.locator(".result-context");
    await expect(context).toContainText("context A1");
  });
});
