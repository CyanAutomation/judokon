import { test, expect } from "@playwright/test";

test.describe("Browse Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/carouselJudoka.html");
  });

  test("essential elements visible", async ({ page }) => {
    await expect(page.getByRole("combobox", { name: FILTER_BY_COUNTRY_LOCATOR })).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("link", { name: /battle!/i })).toBeVisible();
  });

  test("battle link navigates", async ({ page }) => {
    await page.getByRole("link", { name: /battle!/i }).click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });

  test("logo has alt text", async ({ page }) => {
    const logo = page.getByRole("img", { name: "JU-DO-KON! Logo" });
    await expect(logo).toBeVisible();
  });

  test("scroll buttons have labels", async ({ page }) => {
    const left = page.locator(".scroll-button.left");
    const right = page.locator(".scroll-button.right");
    await expect(left).toHaveAttribute("aria-label", /scroll left/i);
    await expect(right).toHaveAttribute("aria-label", /scroll right/i);
  });

  test("country filter updates carousel", async ({ page }) => {
    const dropdown = page.getByRole("combobox", { name: /filter judoka by country/i });

    // wait for cards to load
    await page.waitForSelector("#carousel-container .judoka-card");

    const allCards = page.locator("#carousel-container .judoka-card");
    const initialCount = await allCards.count();

    await dropdown.selectOption("Japan");

    const filteredCards = page.locator("#carousel-container .judoka-card");
    const filteredCount = await filteredCards.count();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);

    for (let i = 0; i < filteredCount; i++) {
      const flag = filteredCards.nth(i).locator(".card-top-bar img");
      await expect(flag).toHaveAttribute("alt", /Japan flag/i);
    }

    await dropdown.selectOption("all");

    await expect(page.locator("#carousel-container .judoka-card")).toHaveCount(initialCount);
  });
});
