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
      const changeLogTable = main.getByRole("table", { name: "Judoka update log" });
      await expect(changeLogTable).toBeVisible();

      const changeLogRows = changeLogTable.locator("tbody tr");
      await changeLogRows.first().waitFor({ state: "visible" });
      const rowCount = await changeLogRows.count();
      expect(rowCount).toBeGreaterThan(0);

      const headers = changeLogTable.locator("thead th");
      const headerTexts = (await headers.allTextContents()).map((text) => text.trim());
      const findHeaderIndex = (patterns) =>
        headerTexts.findIndex((text) =>
          patterns.some((pattern) => new RegExp(pattern, "i").test(text))
        );
      const dateIndex = findHeaderIndex(["date", "modified"]);
      const versionIndex = findHeaderIndex(["version", "code", "id"]);
      const summaryIndex = findHeaderIndex(["summary", "name"]);

      if (dateIndex === -1) {
        throw new Error(`Date column not found. Available headers: ${headerTexts.join(", ")}`);
      }
      if (versionIndex === -1) {
        throw new Error(
          `Version column not found. Available headers: ${headerTexts.join(", ")}`
        );
      }
      if (summaryIndex === -1) {
        throw new Error(
          `Summary column not found. Available headers: ${headerTexts.join(", ")}`
        );
      }

      // Header validation is now handled by explicit error throwing above

      const dateCells = changeLogRows.locator(`td:nth-child(${dateIndex + 1})`);
      const dates = await dateCells.allTextContents();
      if (dates.length === 0) {
        throw new Error("No date cells found in changelog table");
      }
      if (dates.some((date) => !date.trim())) {
        throw new Error("Empty date cells found in changelog table");
      }

      const parsedDates = dates.map((dateText) => {
        const timestamp = new Date(dateText.trim()).getTime();
        if (Number.isNaN(timestamp)) {
          throw new Error(`Invalid date format: "${dateText.trim()}"`);
        }
        return timestamp;
      });
      const sortedDates = [...parsedDates].sort((a, b) => b - a);
      expect(parsedDates).toEqual(sortedDates);

      const summaryCells = changeLogRows.locator(`td:nth-child(${summaryIndex + 1})`);
      await expect(summaryCells.first()).not.toHaveText("");

      const versionCells = changeLogRows.locator(`td:nth-child(${versionIndex + 1})`);
      await expect(versionCells.first()).not.toHaveText("");

      const smokeRow = changeLogRows.filter({ hasText: "Shōzō Fujii" });
      await expect(smokeRow).toHaveCount(1);
      await expect(smokeRow.first().locator("td").nth(dateIndex)).toHaveText("2025-04-28");
      await expect(smokeRow.first().locator("td").nth(summaryIndex)).toContainText(
        "Shōzō Fujii"
      );
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
