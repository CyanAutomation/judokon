import { test, expect } from "@playwright/test";

const FILTER_BY_COUNTRY_LOCATOR = /Filter( judokas?)? by country/i;

test.describe("Browse Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/src/data/judoka.json", (route) =>
      route.fulfill({ path: "tests/fixtures/judoka.json" })
    );
    await page.route("**/src/data/gokyo.json", (route) =>
      route.fulfill({ path: "tests/fixtures/gokyo.json" })
    );
    await page.route("**/src/data/countryCodeMapping.json", (route) =>
      route.fulfill({ path: "tests/fixtures/countryCodeMapping.json" })
    );
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
    const dropdown = page.getByRole("combobox", { name: FILTER_BY_COUNTRY_LOCATOR });

    // wait for cards to load
    await page.waitForSelector("#carousel-container .judoka-card");

    const allCards = page.locator("#carousel-container .judoka-card");
    const initialCount = await allCards.count();
    expect(initialCount).toBe(3);

    await dropdown.selectOption("Japan");

    const filteredCards = page.locator("#carousel-container .judoka-card");
    const filteredCount = await filteredCards.count();
    expect(filteredCount).toBe(1);

    for (let i = 0; i < filteredCount; i++) {
      const flag = filteredCards.nth(i).locator(".card-top-bar img");
      await expect(flag).toHaveAttribute("alt", /Japan flag/i);
    }

    await dropdown.selectOption("all");

    await expect(page.locator("#carousel-container .judoka-card")).toHaveCount(initialCount);
  });

  test("displays country flags", async ({ page }) => {
    await page.waitForSelector("#country-list .slide");
    await expect(page.locator("#country-list .slide")).toHaveCount(3);
  });
});
