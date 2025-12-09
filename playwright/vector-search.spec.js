import { test, expect } from "./fixtures/commonSetup.js";

const TEST_QUERY = "alpha";
const EMBEDDINGS_FIXTURE = "tests/fixtures/client_embeddings_vector.json";
const TRANSFORMER_STUB = "export async function pipeline(){return async()=>({ data:[1,1]});}";

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
  await page.evaluate(() => window.vectorSearchResultsPromise);
}

test.describe("Vector search page", () => {
  test("renders fixture results in score order", async ({ page }) => {
    await gotoVectorSearch(page);
    await runSearch(page);

    const rows = page.locator("#vector-results-table tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("docA.md");
    await expect(rows.nth(1)).toContainText("docB.md");

    const scores = await rows.evaluateAll((elements) =>
      elements.map((el) => parseFloat(el.querySelector("td:last-child")?.textContent ?? "0"))
    );
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1]);
    expect(scores[0]).toBeGreaterThan(0.7);
    expect(scores[1]).toBeGreaterThan(0.6);
  });

  test("shows empty state when no embeddings are available", async ({ page }) => {
    await gotoVectorSearch(page, { embeddingsBody: "[]" });
    await runSearch(page);

    await expect(page.locator("#vector-results-table tbody tr")).toHaveCount(0);
    await expect(page.locator("#search-results-message")).toHaveText(
      "No close matches found — refine your query."
    );
  });

  test("shows error state when the model fails to load", async ({ page }) => {
    await gotoVectorSearch(page, { transformerFailure: 500 });
    await runSearch(page);

    await expect(page.locator("#search-results-message")).toHaveText(
      "An error occurred while searching."
    );
  });
});
