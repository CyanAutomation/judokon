import { test, expect } from "./fixtures/commonSetup.js";
import { NAV_CLASSIC_BATTLE } from "./fixtures/navigationChecks.js";

const NAV_PAGES = [
  { url: "/src/pages/browseJudoka.html", linkId: NAV_CLASSIC_BATTLE },
  { url: "/src/pages/randomJudoka.html", linkId: NAV_CLASSIC_BATTLE }
];

test.describe.parallel("Navigation links", () => {
  for (const { url, linkId } of NAV_PAGES) {
    test(`battle link navigates from ${url}`, async ({ page }) => {
      await page.goto(url);
      await page.getByTestId(linkId).click();
      await expect(page).toHaveURL(/battleJudoka\.html/);
    });
  }
});
