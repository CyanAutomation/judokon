import { test, expect } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE
} from "./fixtures/navigationChecks.js";

test.describe.parallel("Meditation screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("settings", JSON.stringify({ typewriterEffect: false }))
    );
    await page.goto("/src/pages/meditation.html");
  });

  test("page basics", async ({ page }) => {
    await verifyPageBasics(page, [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE]);
  });

  test("elements are visible", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /pause\. breathe\. reflect\./i })).toBeVisible();
    await expect(page.getByAltText(/KG is ready to meditate/i)).toBeVisible();
    await expect(page.locator("#quote")).toBeVisible();
    await expect(page.getByTestId("continue-link")).toBeVisible();
  });

  test("continue button navigates home", async ({ page }) => {
    await page.getByTestId("continue-link").click();
    await expect(page).toHaveURL(/index\.html/);
  });

  test("accessibility attributes present", async ({ page }) => {
    const quote = page.locator("#quote");
    await expect(quote).toHaveAttribute("aria-labelledby", "quote-heading");
    await expect(quote).toHaveAttribute("aria-describedby", "quote-content");
  });
});
