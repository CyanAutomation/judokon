import { test, expect } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE
} from "./fixtures/navigationChecks.js";

test.describe("Change log page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/changeLog.html");
  });

  test("header and footer visible", async ({ page }) => {
    await verifyPageBasics(page, [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE]);
  });

  test("captures screenshot", async ({ page }) => {
    await expect(page).toHaveScreenshot("changeLog.png", { fullPage: true });
  });
});
