import { test, expect } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_UPDATE_JUDOKA,
  NAV_CLASSIC_BATTLE
} from "./fixtures/navigationChecks.js";

test.describe("Update Judoka page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/navigationItems.json", (route) =>
      route.fulfill({ path: "tests/fixtures/navigationItems.json" })
    );
    await page.goto("/src/pages/updateJudoka.html");
  });

  test("page loads", async ({ page }) => {
    await verifyPageBasics(page, [NAV_RANDOM_JUDOKA, NAV_UPDATE_JUDOKA, NAV_CLASSIC_BATTLE]);
  });

  test("navigation links work", async ({ page }) => {
    await page.getByTestId(NAV_RANDOM_JUDOKA).click();
    await expect(page).toHaveURL(/randomJudoka\.html/);
    // Wait for bottom navigation links to populate
    await page.getByTestId(NAV_UPDATE_JUDOKA).waitFor();
    await page.goBack({ waitUntil: "load" });

    await page.getByTestId(NAV_UPDATE_JUDOKA).click();
    await expect(page).toHaveURL(/updateJudoka\.html/);

    const battleLink = page.getByTestId(NAV_CLASSIC_BATTLE);
    await battleLink.waitFor();
    await expect(battleLink).toHaveCount(1);
  });
});
