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
    await expect(dateCells.first()).toHaveText(/^\d{4}-\d{2}-\d{2}$/);

    const sampleCount = 5;
    await expect.poll(async () => {
      const values = await dateCells.evaluateAll(
        (cells, count) => cells.slice(0, count).map((cell) => cell.textContent?.trim() || ""),
        sampleCount
      );
      if (values.length < sampleCount) return false;
      if (!values.every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))) return false;
      const timestamps = values.map((value) => new Date(value).getTime());
      return timestamps.every((value, index) => (index === 0 ? true : value <= timestamps[index - 1]));
    }).toBe(true);

    const detailLinks = rows.locator("td:nth-child(3) a");
    await expect(detailLinks).toHaveCount(await rows.count());
    const hrefs = await detailLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href"))
    );
    expect(hrefs.every((href) => typeof href === "string" && href.length > 0)).toBe(true);

    const firstRow = rows.first();
    const firstDateText = await firstRow.locator("td:nth-child(5)").textContent();
    expect(firstDateText).not.toBeNull();
    const firstDate = new Date(firstDateText!.trim());
    const now = Date.now();
    const maxAgeMs = 1000 * 60 * 60 * 24 * 365;
    expect(Number.isNaN(firstDate.getTime())).toBe(false);
    expect(firstDate.getTime()).toBeLessThanOrEqual(now);
    expect(firstDate.getTime()).toBeGreaterThanOrEqual(now - maxAgeMs);

    const firstDetailLink = firstRow.locator("td:nth-child(3) a");
    const detailHref = await firstDetailLink.getAttribute("href");
    expect(detailHref).not.toBeNull();
    const resolvedHref = new URL(detailHref!, page.url()).toString();
    const popupPromise = page.waitForEvent("popup", { timeout: 2000 }).catch(() => null);
    await firstDetailLink.click();
    const popup = await popupPromise;
    if (popup) {
      await expect(popup).toHaveURL(resolvedHref);
      await popup.close();
    } else {
      await expect(page).toHaveURL(resolvedHref);
      await page.goBack();
    }

    const homeLink = page.getByTestId("home-link");
    await expect(homeLink).toHaveAttribute("href", "../../index.html");
    await homeLink.focus();
    await expect(homeLink).toBeFocused();
    await homeLink.click();
    await expect(page).toHaveURL(/index\.html/);
    await expect(page.getByRole("main")).toBeVisible();
  });
});
