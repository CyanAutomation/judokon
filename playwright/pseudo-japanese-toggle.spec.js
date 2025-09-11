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
test.describe("Pseudo-Japanese toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/aesopsFables.json", (route) =>
      route.fulfill({ path: STORY_FIXTURE })
    );
    await page.route("**/src/data/aesopsMeta.json", (route) =>
      route.fulfill({ path: META_FIXTURE })
    );
    await page.addInitScript(() =>
      localStorage.setItem(
        "settings",
        JSON.stringify({
          typewriterEffect: false,
          featureFlags: { enableTestMode: { enabled: true } }
        })
      )
    );
    await page.goto("/src/pages/meditation.html");
    await page.evaluate(() => window.quoteReadyPromise);
  });

  test("toggle updates quote text", async ({ page }) => {
    await verifyPageBasics(page, []); // Meditation screen has no nav links

    const quote = page.locator("#quote");
    const toggle = page.getByTestId("language-toggle");

    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    
    // Test functional behavior instead of innerHTML comparison
    const originalClasses = await quote.getAttribute("class");
    expect(originalClasses).not.toMatch(/jp-font/);

    await toggle.click();
    await expect(quote).toHaveClass(/jp-font/);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    
    // Verify the toggle changed the visual presentation (classes, not innerHTML)
    const toggledClasses = await quote.getAttribute("class");
    expect(toggledClasses).toMatch(/jp-font/);

    await toggle.click();
    await expect(quote).not.toHaveClass(/jp-font/);
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    
    // Verify we returned to original state functionally
    const revertedClasses = await quote.getAttribute("class");
    expect(revertedClasses).toBe(originalClasses);
  });
});
