import { expect, test } from "./fixtures/commonSetup.js";
import {
  verifyPageBasics,
  NAV_RANDOM_JUDOKA,
  NAV_CLASSIC_BATTLE,
  NAV_UPDATE_JUDOKA,
  NAV_BROWSE_JUDOKA,
  NAV_MEDITATION,
  NAV_SETTINGS
} from "./fixtures/navigationChecks.js";

const manageJudokaNavLinks = [
  {
    id: NAV_CLASSIC_BATTLE,
    text: "Classic Battle",
    href: "./battleClassic.html",
    destination: "/src/pages/battleClassic.html"
  },
  {
    id: NAV_UPDATE_JUDOKA,
    text: "Update Judoka",
    href: "./updateJudoka.html",
    destination: "/src/pages/updateJudoka.html"
  },
  {
    id: NAV_RANDOM_JUDOKA,
    text: "Random Judoka",
    href: "./randomJudoka.html",
    destination: "/src/pages/randomJudoka.html"
  },
  {
    id: NAV_BROWSE_JUDOKA,
    text: "Browse Judoka",
    href: "./browseJudoka.html",
    destination: "/src/pages/browseJudoka.html"
  },
  {
    id: NAV_MEDITATION,
    text: "Meditation",
    href: "./meditation.html",
    destination: "/src/pages/meditation.html"
  },
  {
    id: NAV_SETTINGS,
    text: "Settings",
    href: "./settings.html",
    destination: "/src/pages/settings.html"
  }
];

const pages = [
  {
    url: "/src/pages/createJudoka.html",
    name: "Create Judoka",
    navLinks: manageJudokaNavLinks,
    assertions: [
      { type: "locator", selector: 'main[role="main"]' },
      { type: "locator", selector: "#carousel-section" },
      { type: "locator", selector: '[data-testid="carousel-container"]' },
      { type: "text", text: "Classic Battle" },
      { type: "text", text: "Update Judoka" }
    ],
    options: { verifyNavTargets: true },
    expectations: async (page) => {
      const main = page.getByRole("main");
      await expect(main.getByTestId("carousel-container")).toBeHidden();
    }
  },
  {
    url: "/src/pages/updateJudoka.html",
    name: "Update Judoka",
    navLinks: manageJudokaNavLinks,
    assertions: [
      { type: "locator", selector: 'main[role="main"]' },
      { type: "locator", selector: "#carousel-section" },
      { type: "locator", selector: '[data-testid="carousel-container"]' },
      { type: "text", text: "Update Judoka" },
      { type: "text", text: "Random Judoka" }
    ],
    options: { verifyNavTargets: true },
    expectations: async (page) => {
      const main = page.getByRole("main");
      await expect(main.getByTestId("carousel-container")).toBeHidden();
    }
  },
  {
    url: "/src/pages/changeLog.html",
    name: "Change Log",
    navLinks: [],
    assertions: [
      { type: "heading", text: "Recent Judoka Updates" },
      { type: "locator", selector: 'main[role="main"]' },
      { type: "locator", selector: "#changelog-table" }
    ],
    options: { expectNav: false },
    expectations: async (page) => {
      const main = page.getByRole("main");
      await expect(main.getByRole("table", { name: "Judoka update log" })).toBeVisible();
      const changeLogRows = main.locator("#changelog-table tbody tr");
      await expect(changeLogRows).toHaveCount(3);
      const firstRowCells = changeLogRows.first().locator("td");
      await expect(firstRowCells.nth(0)).toHaveText("776");
      await expect(firstRowCells.nth(2)).toHaveText("Shōzō Fujii");
      await expect(firstRowCells.nth(4)).toHaveText("2025-04-28");
    }
  }
];

test.describe("Static pages", () => {
  for (const {
    url,
    name,
    assertions,
    navLinks = [NAV_RANDOM_JUDOKA, NAV_CLASSIC_BATTLE],
    options = {},
    expectations
  } of pages) {
    test(`${name} page loads and has correct content`, async ({ page }) => {
      await page.goto(url);
      await verifyPageBasics(page, navLinks, assertions, options);
      if (expectations) {
        await expectations(page);
      }
    });
  }
});
