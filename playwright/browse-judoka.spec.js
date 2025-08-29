import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics, NAV_CLASSIC_BATTLE } from "./fixtures/navigationChecks.js";

const COUNTRY_TOGGLE_LOCATOR = "country-toggle";

test.describe("Browse Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/src/pages/browseJudoka.html");
    await verifyPageBasics(page, [NAV_CLASSIC_BATTLE]);
  });

  test("browse judoka elements visible", async ({ page }) => {
    await expect(page.getByTestId(COUNTRY_TOGGLE_LOCATOR)).toBeVisible();
    await expect(page.getByTestId("country-toggle")).toHaveAttribute(
      "aria-label",
      /country filter/i
    );
  });

  test("scroll buttons have labels", async ({ page }) => {
    const left = page.getByRole("button", { name: /prev\./i });
    const right = page.getByRole("button", { name: /next/i });
    await expect(left).toBeVisible();
    await expect(right).toBeVisible();
  });

  test("classic battle link navigates", async ({ page }) => {
    await page.getByTestId(NAV_CLASSIC_BATTLE).click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });

  test("filter panel toggles", async ({ page }) => {
    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);
    const panel = page.getByRole("region");

    await expect(panel).toBeHidden();
    await toggle.click();
    await expect(panel).toBeVisible();
    await toggle.click();
    await expect(panel).toBeHidden();
  });

  test("selecting a country filters cards", async ({ page }) => {
    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);
    await toggle.click();

    await page.getByRole("button", { name: "Japan" }).click({ force: true });

    const filteredCards = page.locator("[data-testid=carousel-container] .judoka-card");
    await expect(filteredCards).toHaveCount(1);
    for (let i = 0; i < (await filteredCards.count()); i++) {
      const flag = filteredCards.nth(i).locator(".card-top-bar img");
      await expect(flag).toHaveAttribute("alt", /Japan flag/i);
    }
  });

  test("resetting filter shows all judoka", async ({ page }) => {
    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);

    await page.locator('body[data-browse-judoka-ready="true"]').waitFor();
    const allCards = page.locator("[data-testid=carousel-container] .judoka-card");
    const initialCount = await allCards.count();

    await toggle.click();
    await page.getByRole("button", { name: "Japan" }).click({ force: true });

    await toggle.click();
    const allButton = page.getByRole("button", { name: "All" });
    await allButton.click({ force: true });

    await expect(page.locator("[data-testid=carousel-container] .judoka-card")).toHaveCount(
      initialCount
    );
  });

  test("displays country flags", async ({ page }) => {
    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);
    await toggle.click();
    await page.locator('body[data-browse-judoka-ready="true"]').waitFor();
    const slides = page.locator("#country-list .slide");
    await expect(slides).toHaveCount(4);
    await expect(slides.first().locator("img")).toHaveAttribute("alt", /all countries/i);
  });

  test("judoka card sets enlarged marker on hover", async ({ page }) => {
    const card = page.locator("#carousel-container .judoka-card").first();
    await page.locator('body[data-browse-judoka-ready="true"]').waitFor();
    await card.hover();
    await expect(card).toHaveAttribute("data-enlarged", "true");
  });

  test("carousel responds to arrow keys", async ({ page }) => {
    await page.route("**/src/data/judoka.json", (route) =>
      route.fulfill({ path: "tests/fixtures/judoka-carousel.json" })
    );
    await page.setViewportSize({ width: 320, height: 800 });
    await page.reload();
    await page.locator('body[data-browse-judoka-ready="true"]').waitFor();
    const container = page.locator('[data-testid="carousel"]');

    await container.focus();
    const markers = page.locator(".scroll-marker");
    const counter = page.locator(".page-counter");
    const left = page.getByRole("button", { name: /prev\.?/i });
    const right = page.getByRole("button", { name: /next/i });
    const pageCount = await markers.count();
    await expect(counter).toHaveText(`Page 1 of ${pageCount}`);
    await expect(left).toBeDisabled();

    for (let i = 2; i <= pageCount; i++) {
      await right.click();
      await expect(counter).toHaveText(`Page ${i} of ${pageCount}`);
    }
    await expect(right).toBeDisabled();

    for (let i = pageCount - 1; i >= 1; i--) {
      await left.click();
      await expect(counter).toHaveText(`Page ${i} of ${pageCount}`);
    }
    await expect(left).toBeDisabled();
  });

  test("carousel responds to swipe gestures", async ({ page }) => {
    await page.route("**/src/data/judoka.json", (route) =>
      route.fulfill({ path: "tests/fixtures/judoka-carousel.json" })
    );
    await page.setViewportSize({ width: 320, height: 800 });
    await page.reload();
    await page.locator('body[data-browse-judoka-ready="true"]').waitFor();
    const container = page.locator(".card-carousel");

    const markers = page.locator(".scroll-marker");
    const counter = page.locator(".page-counter");
    const left = page.getByRole("button", { name: /prev\.?/i });
    const right = page.getByRole("button", { name: /next/i });
    const pageCount = await markers.count();
    await expect(counter).toHaveText(`Page 1 of ${pageCount}`);
    await expect(left).toBeDisabled();

    const box = await container.boundingBox();
    const startX = box.x + box.width * 0.9;
    const endX = box.x + box.width * 0.1;
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

    for (let i = 2; i <= pageCount; i++) {
      await swipe(startX, startX - box.width);
      await expect(counter).toHaveText(`Page ${i} of ${pageCount}`);
    }
    await expect(right).toBeDisabled();

    for (let i = pageCount - 1; i >= 1; i--) {
      await swipe(endX, endX + box.width);
      await expect(counter).toHaveText(`Page ${i} of ${pageCount}`);
    }
    await expect(left).toBeDisabled();
  });

  test("shows loading spinner", async ({ page }) => {
    const context = page.context();
    await context.route("**/src/data/judoka.json", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 111,
            firstname: "Joana",
            surname: "Ramos",
            country: "Portugal",
            countryCode: "pt",
            weightClass: "-52",
            stats: {
              power: 6,
              speed: 7,
              technique: 8,
              kumikata: 7,
              newaza: 6
            },
            signatureMoveId: 1,
            lastUpdated: "2025-04-22T10:00:00Z",
            profileUrl: "https://en.wikipedia.org/wiki/Joana_Ramos",
            bio: "More info to come...",
            gender: "female",
            isHidden: false,
            rarity: "Common",
            cardCode: "WKZ3-H4NF-MXT2-LQ93-JT8C",
            matchesWon: 0,
            matchesLost: 0,
            matchesDrawn: 0
          },
          {
            id: 114,
            firstname: "Nina",
            surname: "Cutro-Kelly",
            country: "United States",
            countryCode: "us",
            weightClass: "+78",
            stats: {
              power: 9,
              speed: 6,
              technique: 7,
              kumikata: 7,
              newaza: 8
            },
            signatureMoveId: 2,
            lastUpdated: "2025-04-20T15:30:00Z",
            profileUrl: "https://en.wikipedia.org/wiki/Nina_Cutro-Kelly",
            bio: "More info to come...",
            gender: "female",
            isHidden: false,
            rarity: "Common",
            cardCode: "WKZ3-H4NF-MXT2-LQ93-JT8D",
            matchesWon: 0,
            matchesLost: 0,
            matchesDrawn: 0
          },
          {
            id: 776,
            firstname: "Shōzō",
            surname: "Fujii",
            country: "Japan",
            countryCode: "jp",
            weightClass: "-81",
            stats: {
              power: 8,
              speed: 8,
              technique: 8,
              kumikata: 7,
              newaza: 8
            },
            signatureMoveId: 3,
            lastUpdated: "2025-04-28T15:30:00Z",
            profileUrl: "https://en.wikipedia.org/wiki/Shōzō_Fujii",
            bio: "More info to come...",
            gender: "male",
            isHidden: false,
            rarity: "Epic",
            cardCode: "WKZ3-H4NF-MXT2-LQ93-JT9D",
            matchesWon: 0,
            matchesLost: 0,
            matchesDrawn: 0
          }
        ])
      });
    });
    await page.context().route("**/src/data/gokyo.json", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 0,
            name: "Jigoku-guruma",
            japanese: "内股",
            category: "Nage-waza",
            subCategory: "Koshi-waza",
            description: "A mysterious unknown move.",
            link: "https://en.wikipedia.org/wiki/judo"
          },
          {
            id: 1,
            name: "Uchi-mata",
            japanese: "内股",
            category: "Nage-waza",
            subCategory: "Koshi-waza",
            description: "A powerful inner thigh throw.",
            link: "https://en.wikipedia.org/wiki/Uchi_mata"
          },
          {
            id: 2,
            name: "O-soto-gari",
            japanese: "大外刈",
            category: "Nage-waza",
            subCategory: "Ashi-waza",
            description: "A major outer reap throw.",
            link: "https://en.wikipedia.org/wiki/O_soto_gari"
          }
        ])
      });
    });

    await page.addInitScript(() => {
      window.__testHooks = window.__testHooks || {
        showSpinnerImmediately: () => {
          window.__showSpinnerImmediately__ = true;
        }
      };
      window.__testHooks.showSpinnerImmediately();
    });
    // Instead of reload, navigate directly to ensure routes are active
    await page.goto("/src/pages/browseJudoka.html");

    const spinner = page.locator(".loading-spinner");
    await expect(spinner).toBeVisible();
    await page.locator('body[data-browse-judoka-ready="true"]').waitFor();
    await expect(spinner).toBeHidden();
  });
}); // Closing brace for test.describe.parallel
