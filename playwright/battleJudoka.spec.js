import { test, expect } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE
} from "./fixtures/navigationChecks.js";

test.describe.parallel("Battle Judoka page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Math.random = () => 0.42;
    });
    await page.goto("/src/pages/battleJudoka.html");
  });

  test("page loads and nav visible", async ({ page }) => {
    await verifyPageBasics(page, [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE]);
  });

  test("navigation links work", async ({ page }) => {
    await page.getByTestId(NAV_RANDOM_JUDOKA).click();
    await expect(page).toHaveURL(/randomJudoka\.html/);
    await page.goBack({ waitUntil: "load" });
    await page.getByTestId(NAV_CLASSIC_BATTLE).click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });

  test("narrow viewport screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 800 });
    await expect(page).toHaveScreenshot("battleJudoka-narrow.png", {
      mask: [page.locator("#battle-state-progress")]
    });
  });
});
