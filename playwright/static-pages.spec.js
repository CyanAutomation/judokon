import { expect, test } from "./fixtures/commonSetup.js";
import { verifyPageBasics, NAV_RANDOM_JUDOKA, NAV_SETTINGS } from "./fixtures/navigationChecks.js";

const pages = [
  {
    url: "/src/pages/createJudoka.html",
    name: "Create Judoka",
    navLinks: [
      {
        id: NAV_RANDOM_JUDOKA,
        text: "Random Judoka",
        href: "./randomJudoka.html",
        destination: "/src/pages/randomJudoka.html"
      }
    ],
    assertions: [{ type: "locator", selector: 'main[role="main"]' }],
    expectations: async (page) => {
      const navLink = page.getByTestId(NAV_RANDOM_JUDOKA);
      await navLink.click();
      await page.waitForURL(/randomJudoka\.html/);
      await page.goBack();
      await expect(page).toHaveURL(/createJudoka\.html/);
    }
  },
  {
    url: "/src/pages/browseJudoka.html",
    name: "Browse Judoka",
    navLinks: [{ id: NAV_SETTINGS, text: "Settings", href: "./settings.html" }],
    assertions: [
      { type: "role", role: "main" },
      { type: "locator", selector: "[data-testid=\"layout-mode-toggle\"]" },
      { type: "locator", selector: "#country-toggle" }
    ],
    options: { expectNav: false },
    expectations: async (page) => {
      const layoutToggle = page.getByTestId("layout-mode-toggle");
      await layoutToggle.click();
      await expect(layoutToggle).toBeChecked();

      const countryToggle = page.locator("#country-toggle");
      await countryToggle.click();
      await expect(countryToggle).toHaveAttribute("aria-expanded", "true");
    }
  },
  {
    url: "/src/pages/changeLog.html",
    name: "Change Log",
    navLinks: [],
    assertions: [
      { type: "heading", text: "Recent Judoka Updates" },
      { type: "locator", selector: "#changelog-table" }
    ],
    options: { expectNav: false },
    expectations: async (page) => {
      const changeLogTable = page.getByRole("table", { name: "Judoka update log" });
      await expect(changeLogTable).toBeVisible();

      const firstRow = changeLogTable.locator("tbody tr").first();
      await expect(firstRow).toBeVisible();
      await expect(firstRow.locator("td").last()).not.toHaveText("");

      const homeLink = page.getByTestId("home-link");
      await homeLink.click();
      await expect(page).toHaveURL(/index\.html/);
    }
  }
];

test.describe("Static pages", () => {
  for (const {
    url,
    name,
    assertions,
    navLinks = [],
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
