import { expect, test } from "./fixtures/commonSetup.js";
import { NAV_RANDOM_JUDOKA } from "./fixtures/navigationChecks.js";

test.describe("Static pages", () => {
  test("Create Judoka navigates to Random flow and back", async ({ page }) => {
    await page.goto("/src/pages/createJudoka.html");

    await expect(page).toHaveTitle(/Ju-Do-Kon!/i);
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await expect(page.getByRole("img", { name: "JU-DO-KON! Logo" })).toBeVisible();
    await expect(page.getByRole("main")).toBeAttached();

    const createForm = page.getByTestId("create-judoka-form");
    await expect(createForm).toBeVisible();
    await expect(page.getByTestId("create-help-text")).toBeVisible();
    await expect(page.getByLabel("First name")).toBeVisible();
    await expect(page.getByLabel("Last name")).toBeVisible();
    await expect(page.getByLabel("Country")).toBeVisible();
    await expect(page.getByLabel("Weight class")).toBeVisible();
    await expect(page.getByTestId("create-form-hint")).toContainText("required");

    const randomLink = page.getByTestId(NAV_RANDOM_JUDOKA);
    await expect(randomLink).toHaveText("Random Judoka");
    await expect(randomLink).toHaveAttribute("href", "./randomJudoka.html");

    const carouselContainer = page.getByTestId("carousel-container");
    await expect(carouselContainer).toHaveClass(/hidden/);

    await randomLink.focus();
    await expect(randomLink).toBeFocused();
    await randomLink.press("Enter");
    await expect(page).toHaveURL(/randomJudoka\.html/);
    await expect(page.getByTestId("player-info")).toHaveText("Player");
    const cardContainer = page.getByTestId("card-container");
    await expect(cardContainer.getByTestId("placeholder-card")).toBeVisible();
    await expect(cardContainer.getByTestId("placeholder-card")).toContainText("Draw Card!");

    await page.goBack();
    await expect(page).toHaveURL(/createJudoka\.html/);
    await expect(page.getByTestId(NAV_RANDOM_JUDOKA)).toBeVisible();
    const carouselContainerAfterReturn = page.getByTestId("carousel-container");
    await expect(carouselContainerAfterReturn).toHaveClass(/hidden/);
    const randomLinkAfterReturn = page.getByTestId(NAV_RANDOM_JUDOKA);
    await randomLinkAfterReturn.focus();
    await expect(randomLinkAfterReturn).toBeFocused();
  });

  test("Browse Judoka toggles layout and country filters", async ({ page }) => {
    await page.goto("/src/pages/browseJudoka.html");

    await expect(page).toHaveTitle(/Ju-Do-Kon!/i);
    await expect(page.getByRole("main")).toBeAttached();
    await expect(page.getByTestId("home-link")).toHaveAttribute("href", "../../index.html");

    const layoutToggle = page.getByTestId("layout-mode-toggle");
    await expect(layoutToggle).toBeVisible();
    await layoutToggle.click();
    await expect(layoutToggle).toBeChecked();

    const countryToggle = page.getByTestId("country-toggle");
    const countryPanel = page.locator("#country-panel");
    await expect(countryToggle).toHaveAttribute("aria-expanded", "false");
    await expect(countryPanel).not.toHaveAttribute("open", "");
    await countryToggle.click();
    await expect(countryPanel).toHaveAttribute("open", "");
    await expect(page.getByRole("region", { name: "Country filter panel" })).toBeVisible();

    const clearFilter = page.getByTestId("clear-filter");
    await expect(clearFilter).toBeVisible();
  });

  test("Change Log lists recent updates and links home", async ({ page }) => {
    await page.goto("/src/pages/changeLog.html");

    await expect(page).toHaveTitle(/Change Log/i);
    await expect(
      page.getByRole("heading", { level: 1, name: "Recent Judoka Updates" })
    ).toBeVisible();

    const changeLogTable = page.getByRole("table", { name: "Judoka update log" });
    await expect(changeLogTable).toBeVisible();
    const headerCells = changeLogTable.locator("thead th");
    await expect(headerCells.filter({ hasText: "Judoka Name" })).toBeVisible();
    await expect(headerCells.filter({ hasText: "Last Modified" })).toBeVisible();

    const firstRow = changeLogTable.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow.locator("td").last()).not.toHaveText("");

    const homeLink = page.getByTestId("home-link");
    await expect(homeLink).toHaveAttribute("href", "../../index.html");
    await homeLink.click();
    await expect(page).toHaveURL(/index\.html/);
  });
});
