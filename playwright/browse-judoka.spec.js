import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";
import { waitForBrowseReady } from "./helpers/browseTestApi.js";
// Use the same dataset the app fetches via route fixtures to avoid mismatches
import judoka from "../tests/fixtures/judoka.json" with { type: "json" };
import countryCodeMapping from "../src/data/countryCodeMapping.json" with { type: "json" };

const COUNTRY_TOGGLE_LOCATOR = "country-toggle";

const EXPECTED_COUNTRY_SLIDE_COUNT =
  new Set(judoka.map((j) => j.countryCode).filter((code) => countryCodeMapping[code])).size + 1; // include 'All' slide

test.describe("Browse Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/src/pages/browseJudoka.html");
    await verifyPageBasics(page, [], [], { expectNav: false });
    await expect(page.locator("nav.top-navbar")).toHaveCount(0);
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

  test("filter panel toggles", async ({ page }) => {
    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);
    const panel = page.getByRole("region", {
      name: /country filter panel/i,
      hidden: true
    });

    await expect(panel).toBeHidden();
    await toggle.click();
    await expect(panel).toBeVisible();
    await toggle.click();
    await expect(panel).toBeHidden();
  });

  test("filters judoka by country and resets", async ({ page }) => {
    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);

    await waitForBrowseReady(page);
    const allCards = page.locator("[data-testid=carousel-container] .judoka-card");
    const initialCount = await allCards.count();

    await toggle.click();
    await page.getByRole("button", { name: "Japan" }).click({ force: true });

    const filteredCards = page.locator("[data-testid=carousel-container] .judoka-card");
    await expect(filteredCards).toHaveCount(1);
    const flag = filteredCards.first().locator(".card-top-bar img");
    await expect(flag).toHaveAttribute("alt", /Japan flag/i);

    await toggle.click();
    await page.getByRole("button", { name: "All" }).click({ force: true });

    await expect(allCards).toHaveCount(initialCount);
  });

  test("displays country flags", async ({ page }) => {
    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);
    await waitForBrowseReady(page);
    await toggle.click();
    const slides = page.locator("#country-list .slide");
    await slides.first().waitFor();

    const slideCount = await slides.count();
    expect(slideCount).toBeGreaterThanOrEqual(4);

    expect(slideCount).toBe(EXPECTED_COUNTRY_SLIDE_COUNT);
    await expect(slides.first().locator("img")).toHaveAttribute("alt", /all countries/i);
  });

  test("carousel updates page counter with arrow keys", async ({ page }) => {
    await page.route("**/src/data/judoka.json", (route) =>
      route.fulfill({ path: "tests/fixtures/judoka-carousel.json" })
    );
    await page.setViewportSize({ width: 320, height: 800 });
    await page.reload();
    await waitForBrowseReady(page);
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
      await page.keyboard.press("ArrowRight");
      await expect(counter).toHaveText(`Page ${i} of ${pageCount}`);
    }
    await expect(right).toBeDisabled();

    for (let i = pageCount - 1; i >= 1; i--) {
      await page.keyboard.press("ArrowLeft");
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
      window.__showSpinnerImmediately__ = true;
    });
    // Instead of reload, navigate directly to ensure routes are active
    await page.goto("/src/pages/browseJudoka.html");

    const spinner = page.locator(".loading-spinner");
    await expect(spinner).toBeVisible();
    await waitForBrowseReady(page);
    await expect(spinner).toBeHidden();
  });
}); // Closing brace for test.describe.parallel
