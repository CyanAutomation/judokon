import * as path from "path";
import { fileURLToPath } from "url";
import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORY_FIXTURE = path.resolve(__dirname, "../tests/fixtures/aesopsFables.json");
const META_FIXTURE = path.resolve(__dirname, "../tests/fixtures/aesopsMeta.json");

/**
 * Ensure the language toggle swaps between English and pseudo-Japanese text.
 */
test.describe.parallel("Pseudo-Japanese toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/aesopsFables.json", (route) =>
      route.fulfill({ path: STORY_FIXTURE })
    );
    await page.route("**/src/data/aesopsMeta.json", (route) =>
      route.fulfill({ path: META_FIXTURE })
    );
    await page.addInitScript(() =>
      localStorage.setItem("settings", JSON.stringify({ typewriterEffect: false }))
    );
    await page.goto("/src/pages/meditation.html");
    await page.waitForSelector("#quote .quote-content");
  });

  test("page basics", async ({ page }) => {
    await verifyPageBasics(page, []); // Meditation screen has no nav links
  });

  test("toggle updates quote text", async ({ page }) => {
    const quote = page.locator("#quote");
    const toggle = page.getByTestId("language-toggle");

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
