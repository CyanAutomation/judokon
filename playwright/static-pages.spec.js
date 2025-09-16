import { test } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE,
} from "./fixtures/navigationChecks.js";
import { expect } from "@playwright/test";

const pages = [
  {
    url: "/src/pages/createJudoka.html",
    name: "Create Judoka",
    assertion: {
      type: "locator",
      selector: '[data-testid="carousel-container"]',
    },
  },
  {
    url: "/src/pages/updateJudoka.html",
    name: "Update Judoka",
    assertion: {
      type: "locator",
      selector: '[data-testid="carousel-container"]',
    },
  },
  {
    url: "/src/pages/changeLog.html",
    name: "Change Log",
    assertion: { type: "heading", text: "Recent Judoka Updates" },
  },
];

test.describe("Static pages", () => {
  for (const { url, name, assertion } of pages) {
    test(`${name} page loads and has correct content`, async ({ page }) => {
      await page.goto(url);
      await verifyPageBasics(page, [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE]);

      if (assertion.type === "heading") {
        await expect(
          page.getByRole("heading", { name: assertion.text })
        ).toBeVisible();
      } else if (assertion.type === "locator") {
        await expect(page.locator(assertion.selector)).toHaveCount(1);
      }
    });
  }
});
