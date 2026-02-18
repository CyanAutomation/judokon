import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";
import { configureApp } from "./fixtures/appConfig.js";

async function loadMeditation(page, { settings = { typewriterEffect: false } } = {}) {
  const app = await configureApp(page, { settings });
  await page.goto("/src/pages/meditation.html");
  await app.applyRuntime();
}

test.describe("Meditation screen", () => {
  test("navigation check", async ({ page }) => {
    await loadMeditation(page);
    await verifyPageBasics(page, [], [], { expectNav: false }); // Meditation screen has no navigation bar
    await expect(page.locator("nav.top-navbar")).toHaveCount(0);
  });

  test("elements visible with accessibility attributes", async ({ page }) => {
    await loadMeditation(page);
    await expect(page.getByRole("heading", { name: /pause\. breathe\. reflect\./i })).toBeVisible();
    await expect(page.getByAltText(/KG is ready to meditate/i)).toBeVisible();
    const quote = page.locator("#quote");
    await expect(quote).toBeVisible();
    await expect(page.getByTestId("continue-link")).toBeVisible();
  });

  test("continue button navigates home", async ({ page }) => {
    await loadMeditation(page);
    await page.evaluate(() => {
      sessionStorage.setItem("meditationSession", "complete");
    });
    await page.getByTestId("continue-link").click();
    await expect(page).toHaveURL(/index\.html/);
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("meditationSession")))
      .toBe("complete");
    await expect
      .poll(() => page.evaluate(() => window.Sentry?.getCurrentHub?.()?.getClient?.().id))
      .toBe("sentry-stub");
  });

  test("keyboard navigation and ARIA landmarks are available", async ({ page }) => {
    await loadMeditation(page);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator("#quote")).toHaveAttribute("role", "region");
    await expect(page.locator("#quote")).toHaveAttribute("aria-live", "polite");

    const continueLink = page.getByTestId("continue-link");
    await continueLink.focus();
    await expect(continueLink).toBeFocused();

    const currentUrl = page.url();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(currentUrl);
  });
});
