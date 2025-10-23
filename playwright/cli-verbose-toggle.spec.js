import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Battle CLI verbose toggle", () => {
  test("updates verbose UI immediately and remains in sync", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {}
    });
    await page.goto("/src/pages/battleCLI.html");

    const indicator = page.locator("#verbose-indicator");
    const verboseSection = page.locator("#cli-verbose-section");
    const verboseLog = page.locator("#cli-verbose-log");
    const checkbox = page.locator("#verbose-toggle");

    await expect(indicator).toBeHidden();
    await expect(indicator).toHaveAttribute("aria-hidden", "true");
    await expect(verboseSection).toBeHidden();
    await expect(verboseLog).toBeHidden();

    const settings = page.locator("#cli-settings");
    const settingsBody = settings.locator("#cli-settings-body");
    await expect(settings).toBeVisible();
    if (!(await settings.evaluate((node) => node.open))) {
      await settings.locator("summary").click();
      await expect(settings).toHaveJSProperty("open", true);
    }
    await expect(settingsBody).toBeVisible();

    const readPersistedVerbose = () =>
      page.evaluate(() => {
        try {
          const raw = localStorage.getItem("settings");
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return parsed?.featureFlags?.cliVerbose?.enabled ?? null;
        } catch {
          return "parse-error";
        }
      });

    await checkbox.check();

    await expect(checkbox).toBeChecked();
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveAttribute("aria-hidden", "false");
    await expect(verboseSection).toBeVisible();
    await expect(verboseLog).toBeVisible();

    await expect.poll(readPersistedVerbose).toBe(true);

    await expect(checkbox).toBeChecked();
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveAttribute("aria-hidden", "false");
    await expect(verboseSection).toBeVisible();

    await checkbox.uncheck();

    await expect(checkbox).not.toBeChecked();
    await expect(indicator).toBeHidden();
    await expect(indicator).toHaveAttribute("aria-hidden", "true");
    await expect(verboseSection).toBeHidden();
    await expect(verboseLog).toBeHidden();

    await expect.poll(readPersistedVerbose).toBe(false);

    await expect(checkbox).not.toBeChecked();
    await expect(indicator).toBeHidden();
    await expect(indicator).toHaveAttribute("aria-hidden", "true");
    await expect(verboseSection).toBeHidden();
    await expect(verboseLog).toBeHidden();
  });
});
