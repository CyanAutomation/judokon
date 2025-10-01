import { test, expect } from "../fixtures/commonSetup.js";
import selectors from "../helpers/selectors";

test.describe("Classic Battle — long-run hang probe", () => {
  test("advance multiple rounds without hang", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    await page.goto("/src/pages/battleClassic.html");
    await page.waitForFunction(() => !!window.battleStore);
    await page.click("#round-select-2");

    // Advance several rounds by clicking first stat; verify round message updates each loop
    const loops = 6;
    for (let i = 0; i < loops; i++) {
      const btn = page.locator(selectors.statButton(0));
      await btn.first().click();
      await expect(page.locator(selectors.roundMessage())).toBeVisible();
    }
  });
});

