import { test } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE
} from "./fixtures/navigationChecks.js";
import { expect } from "@playwright/test";

const pages = [
  {
    url: "/src/pages/createJudoka.html",
    name: "Create Judoka",
    assertions: [
      { type: "locator", selector: '[data-testid="carousel-container"]' },
      { type: "locator", selector: 'main[role="main"]' } // Check main content area
    ]
  },
  {
    url: "/src/pages/updateJudoka.html",
    name: "Update Judoka",
    assertions: [
      { type: "locator", selector: '[data-testid="carousel-container"]' },
      { type: "locator", selector: 'main[role="main"]' }
    ]
  },
  {
    url: "/src/pages/changeLog.html",
    name: "Change Log",
    assertions: [
      { type: "heading", text: "Recent Judoka Updates" },
      { type: "locator", selector: "#changelog-table" }
    ]
  }
];

test.describe("Static pages", () => {
  for (const { url, name, assertions } of pages) {
    test(`${name} page loads and has correct content`, async ({ page }) => {
      await page.goto(url);
      await verifyPageBasics(page, [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE]);

      for (const assertion of assertions) {
        if (assertion.type === "heading") {
          await expect(page.getByRole("heading", { name: assertion.text })).toBeVisible();
        } else if (assertion.type === "locator") {
          await expect(page.locator(assertion.selector)).toHaveCount(1);
        } else if (assertion.type === "text") {
          await expect(page.getByText(assertion.text)).toBeVisible();
        }
      }
    });
  }
});
