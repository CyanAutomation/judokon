import * as path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(__dirname, "../tests/fixtures/aesopsFables.json");

/**
 * Ensure the language toggle swaps between English and pseudo-Japanese text.
 */
test.describe("Pseudo-Japanese toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/aesopsFables.json", (route) =>
      route.fulfill({ path: FIXTURE_PATH })
    );
    await page.goto("/src/pages/meditation.html");
    await page.waitForSelector("#quote .quote-content");
  });

  test("toggle updates quote text", async ({ page }) => {
    const quote = page.locator("#quote");
    const toggle = page.locator("#language-toggle");

    const originalHTML = await quote.innerHTML();

    await toggle.click();
    await expect(quote).toHaveClass(/jp-font/);
    const toggledHTML = await quote.innerHTML();
    expect(toggledHTML).not.toBe(originalHTML);

    await toggle.click();
    await expect(quote).not.toHaveClass(/jp-font/);
    const revertedHTML = await quote.innerHTML();
    expect(revertedHTML).toBe(originalHTML);
  });
});
