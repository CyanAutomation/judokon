import { test, expect } from "../fixtures/commonSetup.js";

test.describe("State badge and debug panel (simplified)", () => {
  test("badge visible with flag", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        battleStateBadge: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    await expect(page.locator("#battle-state-badge")).toBeVisible();
    await expect(page.locator("#battle-state-badge")).toHaveText("Lobby");
  });
});
