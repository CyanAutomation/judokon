import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";

test.describe("Meditation screen", () => {
  test.beforeEach(async ({ page }) => {
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

  test("navigation check", async ({ page }) => {
    await verifyPageBasics(page, []); // Meditation screen has no nav links
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
