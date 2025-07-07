import { test, expect } from "@playwright/test";
import { registerCommonRoutes } from "./fixtures/commonRoutes.js";

const COUNTRY_TOGGLE_LOCATOR = "country-toggle";

test.describe("Browse Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await registerCommonRoutes(page);
    await page.goto("/src/pages/browseJudoka.html");
  });

  test("essential elements visible", async ({ page }) => {
    await expect(page.getByTestId(COUNTRY_TOGGLE_LOCATOR)).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("link", { name: /classic battle/i })).toBeVisible();
  });

  test("battle link navigates", async ({ page }) => {
    await page.getByRole("link", { name: /classic battle/i }).click();
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
    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);

    await page.waitForSelector("[data-testid=carousel-container] .judoka-card");

    const allCards = page.locator("[data-testid=carousel-container] .judoka-card");
    const initialCount = await allCards.count();
    expect(initialCount).toBe(3);

    await toggle.click();
    const panel = page.getByRole("region");
    await panel.waitFor();
    await page.waitForTimeout(500);
    const countAfterFilter = await page
      .locator("[data-testid=carousel-container] .judoka-card")
      .count();
    expect(countAfterFilter).toBe(initialCount);
    await page.getByRole("button", { name: "Japan" }).click({ force: true });

    const filteredCards = page.locator("[data-testid=carousel-container] .judoka-card");
    const filteredCount = await filteredCards.count();
    expect(filteredCount).toBe(1);

    for (let i = 0; i < filteredCount; i++) {
      const flag = filteredCards.nth(i).locator(".card-top-bar img");
      await expect(flag).toHaveAttribute("alt", /Japan flag/i);
    }

    await toggle.click();
    await panel.waitFor();
    await page.waitForTimeout(350);
    await page.getByRole("button", { name: "All" }).click({ force: true });

    await expect(page.locator("[data-testid=carousel-container] .judoka-card")).toHaveCount(
      initialCount
    );
  });

  test("displays country flags", async ({ page }) => {
    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);
    await toggle.click();
    await page.waitForSelector("#country-list .slide");
    const slides = page.locator("#country-list .slide");
    await expect(slides).toHaveCount(4);
    await expect(slides.first().locator("img")).toHaveAttribute("alt", /all countries/i);
  });

  test.skip("judoka card enlarges on hover", async ({ page }) => {
    const card = page.locator("[data-testid=carousel-container] .judoka-card").first();
    await card.waitFor();

    const before = await card.boundingBox();
    await card.hover();
    const after = await card.boundingBox();

    const widthRatio = after.width / before.width;
    expect(widthRatio).toBeGreaterThan(1.08);
    expect(widthRatio).toBeLessThan(1.12);
  });

  test.skip("carousel responds to arrow keys", async ({ page }) => {
    const container = page.locator("[data-testid=carousel-container]");
    await container.waitFor();

    await container.focus();
    const start = await container.evaluate((el) => el.scrollLeft);

    await page.keyboard.press("ArrowRight");
    await expect.poll(() => container.evaluate((el) => el.scrollLeft)).toBeGreaterThan(start);
  });

  test.skip("carousel responds to swipe gestures", async ({ page }) => {
    const container = page.locator(".card-carousel");
    await container.waitFor();

    const box = await container.boundingBox();
    const startX = box.x + box.width * 0.8;
    const y = box.y + box.height / 2;

    const before = await container.evaluate((el) => el.scrollLeft);

    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(startX - 200, y, { steps: 10 });
    await page.mouse.up();

    await expect.poll(() => container.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before);
  });

  test.skip("shows loading spinner on slow network", async ({ page }) => {
    const context = await page.context();
    await context.route("**/src/data/judoka.json", (route) =>
      route.fulfill({ path: "tests/fixtures/judoka.json" })
    );
    await context.route("**/src/data/gokyo.json", (route) =>
      route.fulfill({ path: "tests/fixtures/gokyo.json" })
    );

    // Simulate a slow network
    await context.setNetworkConditions({
      download: 50 * 1024, // 50 KB/s
      upload: 20 * 1024, // 20 KB/s
      latency: 2000 // 2 seconds latency
    });

    await page.reload();

    const spinner = page.locator(".loading-spinner");
    await spinner.waitFor({ state: "visible" });
    await page.waitForSelector(".card-carousel .judoka-card");
    await expect(spinner).toBeHidden();
  });
});
