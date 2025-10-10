import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Battle CLI verbose toggle", () => {
  test("reveals verbose indicator and log section when enabled", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html");

    const indicator = page.locator("#verbose-indicator");
    const verboseSection = page.locator("#cli-verbose-section");
    const verboseLog = page.locator("#cli-verbose-log");

    await expect(indicator).toBeHidden();
    await expect(indicator).toHaveAttribute("aria-hidden", "true");
    await expect(verboseSection).toBeHidden();

    const settingsToggle = page.locator("#cli-settings-toggle");
    const settingsBody = page.locator("#cli-settings-body");
    if (!(await settingsBody.isVisible())) {
      await settingsToggle.click();
      await expect(settingsBody).toBeVisible();
    }

    const checkbox = page.locator("#verbose-toggle");
    await checkbox.check();

    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveAttribute("aria-hidden", "false");
    await expect(verboseSection).toBeVisible();
    await expect(verboseLog).toBeVisible();

    await checkbox.uncheck();
    await expect(indicator).toBeHidden();
    await expect(indicator).toHaveAttribute("aria-hidden", "true");
    await expect(verboseSection).toBeHidden();
  });
});
