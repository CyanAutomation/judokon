import { test, expect } from "./fixtures/commonSetup.js";

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
    { key: "1", points: "3", name: "Quick" },
    { key: "2", points: "5", name: "Medium" },
    { key: "3", points: "10", name: "Long" },
    { key: "1", points: "3", name: "Quick (sync check)" } // Additional case for sync
  ];

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    await page.goto("/src/pages/battleCLI.html");
    await expect(page.locator(".modal-backdrop")).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      try {
        localStorage.removeItem("battle.pointsToWin");
      } catch {}
    });
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
      await expect(header).toContainText(`Round 0 Target: ${points}`);
    });
  }

  test("persists win target selection across reload", async ({ page }) => {
    await openSettingsPanel(page);

    const dropdown = page.locator("#points-select");
    await dropdown.selectOption("10");

    const confirmButton = page.locator('[data-testid="confirm-points-to-win"]');
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    await expect(confirmButton).toBeHidden();

    await expect(page.locator("#cli-header")).toContainText("Round 0 Target: 10");
    await expect(dropdown).toHaveValue("10");
    const revisit = await page.context().newPage();
    try {
      await revisit.addInitScript(() => {
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await revisit.goto("/src/pages/battleCLI.html");
      await expect(revisit.locator(".modal-backdrop")).toBeVisible();
      await expect
        .poll(async () =>
          revisit.evaluate(() => {
            try {
              return localStorage.getItem("battle.pointsToWin");
            } catch {
              return null;
            }
          })
        )
        .toBe("10");
      await expect(revisit.locator("#points-select")).toHaveValue("10");

      await revisit.keyboard.press("3");
      await expect(revisit.locator(".modal-backdrop")).toBeHidden();
      await expect(revisit.locator("#cli-header")).toContainText("Round 0 Target: 10");
    } finally {
      await revisit.close();
    }
  });
});
