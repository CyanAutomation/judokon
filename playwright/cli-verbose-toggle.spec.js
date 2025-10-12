import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Battle CLI verbose toggle", () => {
  test("updates verbose UI immediately and remains in sync", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html");

    const indicator = page.locator("#verbose-indicator");
    const verboseSection = page.locator("#cli-verbose-section");
    const verboseLog = page.locator("#cli-verbose-log");
    const checkbox = page.locator("#verbose-toggle");

    await expect(indicator).toBeHidden();
    await expect(indicator).toHaveAttribute("aria-hidden", "true");
    await expect(verboseSection).toBeHidden();

    const settingsToggle = page.locator("#cli-settings-toggle");
    const settingsBody = page.locator("#cli-settings-body");
    if (!(await settingsBody.isVisible())) {
      await settingsToggle.click();
      await expect(settingsBody).toBeVisible();
    }

    await page.evaluate(async () => {
      if (!window.__battleCLI_toggleVerbose) {
        const moduleNamespace = await window.__battleCLIinit.loadPromise;
        const { toggleVerbose } = await moduleNamespace.setupFlags();
        window.__battleCLI_toggleVerbose = toggleVerbose;
      }
    });

    await page.evaluate(() => {
      window.__battleCLI_togglePromise = window.__battleCLI_toggleVerbose(true);
    });

    await expect(checkbox).toBeChecked();
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveAttribute("aria-hidden", "false");
    await expect(verboseSection).toBeVisible();
    await expect(verboseLog).toBeVisible();

    await page.evaluate(() => window.__battleCLI_togglePromise);

    await expect(checkbox).toBeChecked();
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveAttribute("aria-hidden", "false");
    await expect(verboseSection).toBeVisible();

    await page.evaluate(() => {
      window.__battleCLI_togglePromise = window.__battleCLI_toggleVerbose(false);
    });

    await expect(checkbox).not.toBeChecked();
    await expect(indicator).toBeHidden();
    await expect(indicator).toHaveAttribute("aria-hidden", "true");
    await expect(verboseSection).toBeHidden();

    await page.evaluate(() => window.__battleCLI_togglePromise);

    await expect(checkbox).not.toBeChecked();
    await expect(indicator).toBeHidden();
    await expect(indicator).toHaveAttribute("aria-hidden", "true");
    await expect(verboseSection).toBeHidden();
  });
});
