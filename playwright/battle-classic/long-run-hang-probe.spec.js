import { test, expect } from "../fixtures/commonSetup.js";
import selectors from "../helpers/selectors";

test.describe("Classic Battle — stability probe", () => {
  test("advance a single round without hang", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    await page.goto("/src/pages/battleClassic.html");
    const roundSelectButton = page.locator("#round-select-2");
    await expect(roundSelectButton).toBeVisible();
    await roundSelectButton.click();
    await page.waitForFunction(() => !!window.battleStore);

    const roundMessage = page.locator(selectors.roundMessage());
    await expect(roundMessage).toBeVisible();
    const initialRoundText = (await roundMessage.textContent()) ?? "";

    const btn = page.locator(selectors.statButton());
    await expect(btn.first()).toBeEnabled({ timeout: 10000 });
    await btn.first().click();

    await expect(roundMessage).toBeVisible();
    await page.waitForFunction(
      (selector, previousText) => {
        const current = document.querySelector(selector)?.textContent?.trim();
        return Boolean(current && current !== previousText);
      },
      selectors.roundMessage(),
      initialRoundText?.trim() ?? "",
      { timeout: 10000 }
    );
  });
});
