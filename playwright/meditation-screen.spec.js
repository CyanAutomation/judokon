import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";
import { configureApp } from "./fixtures/appConfig.js";

test.describe("Meditation screen", () => {
  test.beforeEach(async ({ page }) => {
    const app = await configureApp(page, {
      settings: { typewriterEffect: false }
    });
    await page.goto("/src/pages/meditation.html");
    await app.applyRuntime();
    await page.evaluate(() => window.quoteReadyPromise);
  });

  test("navigation check", async ({ page }) => {
    await verifyPageBasics(page, [], [], { expectNav: false }); // Meditation screen has no navigation bar
    await expect(page.locator("nav.top-navbar")).toHaveCount(0);
  });

  test("elements visible with accessibility attributes", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /pause\. breathe\. reflect\./i })).toBeVisible();
    await expect(page.getByAltText(/KG is ready to meditate/i)).toBeVisible();
    const quote = page.locator("#quote");
    await expect(quote).toBeVisible();
    await expect(quote).toHaveAttribute("aria-labelledby", "quote-heading");
    await expect(quote).toHaveAttribute("aria-describedby", "quote-content");
    await expect(page.getByTestId("continue-link")).toBeVisible();
  });

  test("continue button navigates home", async ({ page }) => {
    await page.getByTestId("continue-link").click();
    await expect(page).toHaveURL(/index\.html/);
  });
});
