import { expect, test } from "./fixtures/commonSetup.js";
import { NAV_RANDOM_JUDOKA } from "./fixtures/navigationChecks.js";
import { waitForBrowseReady } from "./fixtures/waits.js";
import judoka from "../tests/fixtures/judoka.json" with { type: "json" };

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

    const readiness = await waitForBrowseReady(page);
    expect(
      readiness.ok,
      readiness.reason ?? "waitForBrowseReady should resolve with a ready snapshot via Test API"
    ).toBe(true);

    const cardList = page.getByRole("list", { name: "Judoka card carousel" });
    const cardItems = cardList.getByRole("listitem");
    await expect(cardItems).toHaveCount(judoka.length);

    const layoutToggle = page.getByTestId("layout-mode-toggle");
    await expect(layoutToggle).toBeVisible();

    const countryToggle = page.getByTestId("country-toggle");
    await countryToggle.click();
    const countryPanel = page.getByRole("region", { name: "Country filter panel" });
    await expect(countryPanel).toBeVisible();

    const countryGroup = page.getByRole("group", { name: /filter judoka by country/i });
    await expect(countryGroup).toBeVisible();
    const baseColumns = await countryGroup.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns
    );

    await layoutToggle.click();
    await expect(layoutToggle).toBeChecked();
    await expect.poll(async () => {
      return await countryGroup.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    }).not.toBe(baseColumns);

    const counts = judoka.reduce((acc, entry) => {
      acc.set(entry.country, (acc.get(entry.country) ?? 0) + 1);
      return acc;
    }, new Map());
    const selection = Array.from(counts.entries()).find(
      ([country]) => country !== "All"
    );
    expect(selection).toBeTruthy();
    const [selectedCountry, expectedCount] = selection;
    const escapedCountry = selectedCountry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const countryOption = page.getByRole("radio", {
      name: new RegExp(`Filter by\\s+${escapedCountry}`, "i")
    });
    await countryOption.check();
    await expect(cardItems).toHaveCount(expectedCount);
  });

  test("Change Log lists recent updates and links home", async ({ page }) => {
    await page.goto("/src/pages/changeLog.html");

    await expect(page).toHaveTitle(/Change Log/i);
    await expect(
      page.getByRole("heading", { level: 1, name: "Recent Judoka Updates" })
    ).toBeVisible();

    const changeLogTable = page.getByRole("table", { name: "Judoka update log" });
    await expect(changeLogTable).toBeVisible();
    await expect(changeLogTable.locator("caption")).toHaveText(/recent judoka updates/i);
    const headerCells = changeLogTable.locator("thead th");
    await expect(headerCells.filter({ hasText: "Judoka Name" })).toHaveAttribute("scope", "col");
    await expect(headerCells.filter({ hasText: "Last Modified" })).toHaveAttribute("scope", "col");
    const headerScopes = await headerCells.evaluateAll((cells) =>
      cells.map((cell) => cell.getAttribute("scope"))
    );
    expect(headerScopes.every((scope) => scope === "col")).toBe(true);

    const rows = changeLogTable.locator("tbody tr");
    await expect(rows).toHaveCount(20);

    const dateCells = rows.locator("td:nth-child(5)");
    const dateStrings = await dateCells.allTextContents();
    expect(dateStrings.every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))).toBe(true);

    const parsedDates = dateStrings.map((value) => new Date(value).getTime());
    expect(
      parsedDates.every((value, index) => (index === 0 ? true : value <= parsedDates[index - 1]))
    ).toBe(true);

    const detailLinks = rows.locator("td:nth-child(3) a");
    await expect(detailLinks).toHaveCount(await rows.count());
    const hrefs = await detailLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href"))
    );
    expect(hrefs.every((href) => typeof href === "string" && href.length > 0)).toBe(true);

    const firstRow = rows.first();
    await expect(firstRow.locator("td").last()).not.toHaveText("");

    const homeLink = page.getByTestId("home-link");
    await expect(homeLink).toHaveAttribute("href", "../../index.html");
    await homeLink.focus();
    await expect(homeLink).toBeFocused();
    await homeLink.click();
    await expect(page).toHaveURL(/index\.html/);
    await expect(page.getByRole("main")).toBeVisible();
  });
});
