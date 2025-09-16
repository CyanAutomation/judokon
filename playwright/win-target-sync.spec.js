import { test, expect } from "@playwright/test";

async function openSettingsPanel(page) {
  const settingsButton = page.locator("#cli-settings-toggle");
  await expect(settingsButton).toBeVisible();

  const settingsBody = page.locator("#cli-settings-body");
  if (!(await settingsBody.isVisible())) {
    await settingsButton.click();
    await expect(settingsBody).toBeVisible();
  }
}

test.describe("Round Selection - Win Target Synchronization", () => {
  const testCases = [
    { key: "1", points: "5", name: "Quick" },
    { key: "2", points: "10", name: "Medium" },
    { key: "3", points: "15", name: "Long" }
  ];

  test.beforeEach(async ({ page }) => {
    // Clear localStorage to force the round select modal to appear
    await page.addInitScript(() => {
      localStorage.clear();
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      delete window.location.search;
      window.__TEST_MODE_ENABLED = false;
    });

    await page.goto("/src/pages/battleCLI.html");
    await expect(page.locator(".modal-backdrop")).toBeVisible({ timeout: 10000 });
  });

  for (const { key, points, name } of testCases) {
    test(`should sync win target dropdown when ${name} is selected`, async ({ page }) => {
      await page.keyboard.press(key);

      await expect(page.locator(".modal-backdrop")).toBeHidden();
      await expect(page.locator("#cli-stats")).toBeVisible();

      await openSettingsPanel(page);

      const dropdown = page.locator("#points-select");
      await expect(dropdown).toHaveValue(points);

      const header = page.locator("#cli-header");
      await expect(header).toContainText(`Round 1 Target: ${points}`);
    });
  }

  test("should maintain synchronization from modal to settings dropdown", async ({ page }) => {
    // Start with Quick (5 points)
    await page.keyboard.press("1");
    await expect(page.locator(".modal-backdrop")).toBeHidden();
    await expect(page.locator("#cli-stats")).toBeVisible();

    await openSettingsPanel(page);

    const dropdown = page.locator("#points-select");
    await expect(dropdown).toHaveValue("5");

    const header = page.locator("#cli-header");
    await expect(header).toContainText("Round 1 Target: 5");
  });
});
