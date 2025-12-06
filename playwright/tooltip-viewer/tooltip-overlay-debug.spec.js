import { test, expect } from "../fixtures/commonSetup.js";
import { waitForFeatureFlagState } from "../helpers/featureFlagHelper.js";

test.describe("tooltipOverlayDebug feature flag", () => {
  test("toggles overlay debug via settings control", async ({ page }) => {
    await page.goto("/src/pages/settings.html");

    const advancedSection = page.locator('details[data-section-id="advanced"]');
    await expect(advancedSection).toBeVisible();
    await advancedSection.locator("summary").click();
    await expect(advancedSection).toHaveAttribute("open");

    const overlayToggle = page.locator("#feature-tooltip-overlay-debug");
    const body = page.locator("body");
    const snackbar = page.locator("#snackbar-container");

    await expect(overlayToggle).toBeVisible();

    await waitForFeatureFlagState(page, "tooltipOverlayDebug", false);
    await expect(body).toHaveAttribute("data-feature-tooltip-overlay-debug", "disabled");

    await overlayToggle.check();

    await waitForFeatureFlagState(page, "tooltipOverlayDebug", true);
    await expect(body).toHaveAttribute("data-feature-tooltip-overlay-debug", "enabled");
    await expect(snackbar).toContainText(/tooltip overlay debug enabled/i);

    await overlayToggle.uncheck();

    await waitForFeatureFlagState(page, "tooltipOverlayDebug", false);
    await expect(body).toHaveAttribute("data-feature-tooltip-overlay-debug", "disabled");
    await expect(snackbar).toContainText(/tooltip overlay debug disabled/i);
  });
});
