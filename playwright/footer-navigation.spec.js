import { test, expect } from "@playwright/test";

test.describe("Footer Navigation", () => {
  test("should be disabled during a match", async ({ page }) => {
    // Go to a blank page
    await page.goto("about:blank");

    // Set the feature flag override
    await page.evaluate(() => {
      window.__FF_OVERRIDES = {
        showRoundSelectModal: true,
      };
    });

    // Go to the page with the feature flag set
    await page.goto("/src/pages/battleClassic.html");

    // Wait for the modal to be visible
    await page.waitForSelector(".modal-backdrop");

    // Start a quick match
    await page.click("button#round-select-1");

    // Wait for the battle to start
    await page.waitForSelector("body[data-battle-active='true']");

    // Check that the footer navigation is disabled
    const footer = await page.locator(".bottom-navbar");
    await expect(footer).toHaveCSS("pointer-events", "none");
    await expect(footer).toHaveCSS("opacity", "0.5");
  });
});