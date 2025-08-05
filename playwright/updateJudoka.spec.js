import { test, expect } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE
} from "./fixtures/navigationChecks.js";

test.describe.parallel("Update Judoka page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/navigationItems.json", (route) =>
      route.fulfill({ path: "tests/fixtures/navigationItems.json" })
    );
    await page.goto("/src/pages/updateJudoka.html");
  });

  test("page loads", async ({ page }) => {
    await verifyPageBasics(page, [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE]);
  });

  test("navigation links work", async ({ page }) => {
    const randomLink = page.getByTestId(NAV_RANDOM_JUDOKA);
    await randomLink.waitFor();
    await randomLink.click();
    await expect(page).toHaveURL(/randomJudoka\.html/);
    await page.goBack({ waitUntil: "load" });

    const battleLink = page.getByTestId(NAV_CLASSIC_BATTLE);
    await battleLink.waitFor();
    await battleLink.click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });
});
