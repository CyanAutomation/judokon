import { test, expect } from "../fixtures/commonSetup.js";
test.describe("State badge", () => {
  test("badge visible with flags", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        enableTestMode: true,
        battleStateBadge: true,
        battleStateBadge: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    await expect(page.locator("#battle-state-badge")).toBeVisible();
    await expect(page.locator("#battle-state-badge")).toHaveText("Lobby");
  });
});
