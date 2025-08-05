import { test, expect } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE
} from "./fixtures/navigationChecks.js";

test.describe.parallel("Create Judoka page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/createJudoka.html");
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
});
