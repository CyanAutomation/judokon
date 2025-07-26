import { test, expect } from "./fixtures/commonSetup.js";
import fs from "fs";

const patchedScript = fs
  .readFileSync("src/helpers/vectorSearchPage.js", "utf8")
  .replace(
    'const { pipeline } = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/dist/transformers.min.js");',
    "const pipeline = async () => async () => [[1,0]];"
  );

test.describe("Vector search page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/helpers/vectorSearchPage.js", (route) =>
      route.fulfill({ contentType: "application/javascript", body: patchedScript })
    );
    await page.route("**/src/data/client_embeddings.json", (route) =>
      route.fulfill({ path: "tests/fixtures/client_embeddings.json" })
    );
    await page.goto("/src/pages/vectorSearch.html");
  });

  test("pressing Enter triggers search and shows results", async ({ page }) => {
    await page.evaluate(() => {
      window.formSubmitted = false;
      document
        .getElementById("vector-search-form")
        .addEventListener("submit", () => (window.formSubmitted = true));
    });
    const input = page.locator("#vector-search-input");
    await input.fill("apple");
    await input.press("Enter");
    await page.waitForFunction(() => window.formSubmitted === true);

    const items = page.locator("#search-results li");
    await expect(items).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(items.nth(i)).toContainText(/Source:/);
      await expect(items.nth(i)).toContainText(/score:/i);
    }
  });

  test("shows message when embeddings fail to load", async ({ page }) => {
    await page.unroute("**/src/data/client_embeddings.json");
    await page.route("**/src/data/client_embeddings.json", (route) =>
      route.fulfill({ status: 404, body: "Not Found" })
    );
    const input = page.locator("#vector-search-input");
    await input.fill("apple");
    await page.click("#vector-search-btn");
    const results = page.locator("#search-results");
    await expect(results).toContainText("Embeddings could not be loaded");
  });
});
