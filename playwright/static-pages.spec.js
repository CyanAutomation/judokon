import { test, expect } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE
} from "./fixtures/navigationChecks.js";

const pages = [
  { url: "/src/pages/createJudoka.html", name: "Create Judoka" },
  { url: "/src/pages/updateJudoka.html", name: "Update Judoka" },
  { url: "/src/pages/changeLog.html", name: "Change Log" }
];

test.describe.parallel("Static pages", () => {
  for (const { url, name } of pages) {
    test(`${name} page loads and nav visible`, async ({ page }) => {
      await page.goto(url);
      await verifyPageBasics(page, [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE]);
    });
  }
});
