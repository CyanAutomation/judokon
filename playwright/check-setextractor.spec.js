import { test, expect } from "./fixtures/commonSetup.js";

test("check window.__setExtractor", async ({ page }) => {
  await page.goto("/src/pages/vectorSearch.html");
  
  const hasSetExtractor = await page.evaluate(() => {
    return typeof window.__setExtractor;
  });
  
  console.log("window.__setExtractor type:", hasSetExtractor);
  expect(hasSetExtractor).not.toBe("undefined");
});
