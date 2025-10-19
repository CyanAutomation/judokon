import { test } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE
} from "./fixtures/navigationChecks.js";

const pages = [
  {
    url: "/src/pages/createJudoka.html",
    name: "Create Judoka",
    navLinks: [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE],
    assertions: [
      { type: "locator", selector: '[data-testid="carousel-container"]' },
      { type: "locator", selector: 'main[role="main"]' } // Check main content area
    ]
  },
  {
    url: "/src/pages/updateJudoka.html",
    name: "Update Judoka",
    navLinks: [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE],
    assertions: [
      { type: "locator", selector: '[data-testid="carousel-container"]' },
      { type: "locator", selector: 'main[role="main"]' }
    ]
  },
  {
    url: "/src/pages/changeLog.html",
    name: "Change Log",
    navLinks: [],
    assertions: [
      { type: "heading", text: "Recent Judoka Updates" },
      { type: "locator", selector: "#changelog-table" }
    ],
    options: { expectNav: false }
  }
];

test.describe("Static pages", () => {
  for (const {
    url,
    name,
    assertions,
    navLinks = [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE],
    options = {}
  } of pages) {
    test(`${name} page loads and has correct content`, async ({ page }) => {
      await page.goto(url);
      await verifyPageBasics(page, navLinks, assertions, options);
    });
  }
});
