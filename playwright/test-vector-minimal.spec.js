import { test, expect } from "./fixtures/commonSetup.js";

const TEST_QUERY = "alpha";
const EMBEDDINGS_FIXTURE = "tests/fixtures/client_embeddings_vector.json";
const TRANSFORMER_STUB = "export async function pipeline(){return async()=>({ data:[1,1]});}";

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

test("minimal error test", async ({ page }) => {
  await stubVectorSearch(page);
  await page.goto("/src/pages/vectorSearch.html");
  
  // First search
  await page.getByRole("searchbox").fill(TEST_QUERY);
  await page.getByRole("button", { name: /search/i }).click();
  await page.waitForTimeout(2000); // Wait for search to complete
  
  const rows = page.locator("#vector-results-table tbody tr");
  await expect(rows).not.toHaveCount(0);
  console.log("First search completed");
  
  // Mock the extractor
  await page.evaluate(() => {
    console.log("Setting throwing extractor");
    if (window.__setExtractor) {
      window.__setExtractor(async () => {
        console.log("Throwing extractor called");
        throw new Error("Model failed to load");
      });
    }
  });
  
  // Second search
  console.log("Starting second search");
  await page.getByRole("searchbox").fill(TEST_QUERY);
  await page.getByRole("button", { name: /search/i }).click();
  console.log("Clicked search button");
  
  // Wait a bit and check error message
  await page.waitForTimeout(3000);
  console.log("Waited 3 seconds");
  
  const errorMessage = page.locator("#search-results-message");
  await expect(errorMessage).toBeVisible({ timeout: 5000 });
  console.log("Error message visible");
});
