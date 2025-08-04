import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics, NAV_CLASSIC_BATTLE } from "./fixtures/navigationChecks.js";

const COUNTRY_TOGGLE_LOCATOR = "country-toggle";

test.describe("Browse Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/browseJudoka.html");
  });

  test("essential elements visible", async ({ page }) => {
    await expect(page.getByTestId(COUNTRY_TOGGLE_LOCATOR)).toBeVisible();
    await expect(page.getByTestId("country-toggle")).toHaveAttribute(
      "aria-label",
      /country filter/i
    );
    await verifyPageBasics(page, [NAV_CLASSIC_BATTLE]);
  });

  test("battle link navigates", async ({ page }) => {
    await page.getByTestId(NAV_CLASSIC_BATTLE).click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });

  test("logo has alt text", async ({ page }) => {
    const logo = page.getByRole("img", { name: "JU-DO-KON! Logo" });
    await expect(logo).toBeVisible();
  });

  test("scroll buttons have labels", async ({ page }) => {
    const left = page.getByRole("button", { name: /prev\./i });
    const right = page.getByRole("button", { name: /next/i });
    await expect(left).toBeVisible();
    await expect(right).toBeVisible();
  });

  test("country filter updates carousel", async ({ page }) => {
    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);

    await page.waitForSelector("[data-testid=carousel-container] .judoka-card");

    const allCards = page.locator("[data-testid=carousel-container] .judoka-card");
    const initialCount = await allCards.count();
    expect(initialCount).toBe(3);

    await toggle.click();
    const panel = page.getByRole("region");
    await expect(panel).toBeVisible();
    await expect(page.locator("[data-testid=carousel-container] .judoka-card")).toHaveCount(
      initialCount
    );
    await page.getByRole("button", { name: "Japan" }).click({ force: true });

    const filteredCards = page.locator("[data-testid=carousel-container] .judoka-card");
    await expect(filteredCards).toHaveCount(1);

    for (let i = 0; i < (await filteredCards.count()); i++) {
      const flag = filteredCards.nth(i).locator(".card-top-bar img");
      await expect(flag).toHaveAttribute("alt", /Japan flag/i);
    }

    await toggle.click();
    await expect(panel).toBeVisible();
    const allButton = page.getByRole("button", { name: "All" });
    await expect(allButton).toBeVisible();
    await allButton.click({ force: true });

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

  test("judoka card enlarges on hover", async ({ page }) => {
    const card = page.locator("#carousel-container .judoka-card").first();
    await card.waitFor();

    const before = await card.boundingBox();
    await card.hover();
    const after = await card.boundingBox();

    const widthRatio = after.width / before.width;
    expect(widthRatio).toBeGreaterThan(1.04);
    expect(widthRatio).toBeLessThan(1.09);
  });

  test("carousel responds to arrow keys", async ({ page }) => {
    await page.route("**/src/data/judoka.json", (route) =>
      route.fulfill({ path: "tests/fixtures/judoka-carousel.json" })
    );
    await page.setViewportSize({ width: 320, height: 800 });
    await page.reload();
    const container = page.locator('[data-testid="carousel"]');
    await page.waitForSelector('[data-testid="carousel"] .judoka-card');

    await container.focus();
    const markers = page.locator(".scroll-marker");
    const counter = page.locator(".page-counter");
    await expect(markers).toHaveCount(6);
    await expect(counter).toHaveText("Page 1 of 6");

    await container.evaluate((el) => {
      el.scrollTo({ left: el.scrollWidth, behavior: "auto" });
    });

    await expect.poll(() => counter.textContent()).toBe("Page 6 of 6");
  });

  test("carousel responds to swipe gestures", async ({ page }) => {
    await page.route("**/src/data/judoka.json", (route) =>
      route.fulfill({ path: "tests/fixtures/judoka-carousel.json" })
    );
    await page.setViewportSize({ width: 320, height: 800 });
    await page.reload();
    const container = page.locator(".card-carousel");
    await container.waitFor();
    await page.waitForSelector('[data-testid="carousel"] .judoka-card');

    const markers = page.locator(".scroll-marker");
    const counter = page.locator(".page-counter");
    await expect(markers).toHaveCount(6);
    await expect(counter).toHaveText("Page 1 of 6");

    const box = await container.boundingBox();
    const startX = box.x + box.width * 0.9;
    const y = box.y + box.height / 2;
    const swipe = (from, to) =>
      page.evaluate(
        ({ from, to, y }) => {
          const el = document.querySelector(".card-carousel");
          el.dispatchEvent(
            new TouchEvent("touchstart", {
              bubbles: true,
              cancelable: true,
              touches: [new Touch({ identifier: 1, target: el, clientX: from, clientY: y })]
            })
          );
          el.dispatchEvent(
            new TouchEvent("touchend", {
              bubbles: true,
              cancelable: true,
              changedTouches: [new Touch({ identifier: 1, target: el, clientX: to, clientY: y })]
            })
          );
        },
        { from, to, y }
      );

    const before = await container.evaluate((el) => el.scrollLeft);
    await swipe(startX, startX - box.width);

    await expect.poll(() => container.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before);
    await expect(counter).toHaveText("Page 2 of 6");
  });

  test.skip("shows loading spinner on slow network", async ({ page }) => {
    const context = await page.context();
    await context.route("**/src/data/judoka.json", async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      await route.fulfill({ path: "tests/fixtures/judoka.json" });
    });
    await context.route("**/src/data/gokyo.json", async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      await route.fulfill({ path: "tests/fixtures/gokyo.json" });
    });

    await page.reload();

    const spinner = page.locator(".loading-spinner");
    await spinner.waitFor({ state: "visible" });
    await page.waitForSelector(".card-carousel .judoka-card");
    await expect(spinner).toBeHidden();
  });
});
