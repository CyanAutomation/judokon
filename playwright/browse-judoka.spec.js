import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";
import { waitForBrowseReady } from "./fixtures/waits.js";
import { createDeferredResponse } from "./fixtures/appConfig.js";
// Use the same dataset the app fetches via route fixtures to avoid mismatches
import judoka from "../tests/fixtures/judoka.json" with { type: "json" };
import countryCodeMapping from "../src/data/countryCodeMapping.json" with { type: "json" };
import gokyo from "../tests/fixtures/gokyo.json" with { type: "json" };

const COUNTRY_TOGGLE_LOCATOR = "country-toggle";
const COUNTRY_FLAG_OPTION = "country-flag-option";
const JUDOKA_CARD = "judoka-card";

const EXPECTED_COUNTRY_SLIDE_COUNT =
  new Set(judoka.map((j) => j.countryCode).filter((code) => countryCodeMapping[code])).size + 1; // include 'All' slide

async function expectBrowseReadiness(page, options) {
  const readiness = await waitForBrowseReady(page, options);
  expect(
    readiness.ok,
    readiness.reason ?? "waitForBrowseReady should resolve with a ready snapshot via Test API"
  ).toBe(true);
  return readiness;
}

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

    await expectBrowseReadiness(page);
    await expect(panel).toBeHidden();
    await toggle.click();
    await expect(panel).toBeVisible();
    await toggle.click();
    await expect(panel).toBeHidden();
  });

  test("filters judoka by country and resets", async ({ page }) => {
    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);
    const panel = page.getByRole("region", {
      name: /country filter panel/i,
      hidden: true
    });

    const readiness = await expectBrowseReadiness(page);
    const initialCount = readiness.snapshot?.cardCount ?? 0;
    const allCards = page.getByTestId(JUDOKA_CARD);
    await expect(allCards).toHaveCount(initialCount);

    await toggle.click();
    await expect(panel).toBeVisible();
    await page.addStyleTag({
      content: ".country-flag-slide-track { animation: none !important; }"
    });
    const japanOption = page
      .getByTestId(COUNTRY_FLAG_OPTION)
      .filter({ hasText: "Japan" })
      .first();
    await japanOption.click();
    await expect(panel).toBeHidden();
    await toggle.click();
    await expect(panel).toBeVisible();
    const japanRadio = page.getByRole("radio", { name: "Japan" });
    await expect(japanRadio).toBeChecked();

    const filteredCards = page.getByTestId(JUDOKA_CARD);
    await expect(filteredCards).toHaveCount(1);
    const flag = filteredCards.first().locator(".card-top-bar img");
    await expect(flag).toHaveAttribute("alt", /Japan flag/i);

    const allOption = page
      .getByTestId(COUNTRY_FLAG_OPTION)
      .filter({ hasText: "All" })
      .first();
    await allOption.click();
    const allRadio = page.getByRole("radio", { name: "All" });
    await expect(allRadio).toBeChecked();

    await expect(allCards).toHaveCount(initialCount);
  });

  test("displays country flags", async ({ page }) => {
    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);
    await expectBrowseReadiness(page);
    await toggle.click();
    const slides = page.getByTestId(COUNTRY_FLAG_OPTION);
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
    await expectBrowseReadiness(page);
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
    await page.route("**/src/helpers/classicBattle/opponentPromptTracker.js", async (route) => {
      const response = await route.fetch();
      let body = await response.text();
      if (!/isOpponentPromptReady/.test(body)) {
        // TODO: Remove this patch once isOpponentPromptReady is exported directly from opponentPromptTracker.js.
        body +=
          "\nexport function isOpponentPromptReady() {\n  return getOpponentPromptTimestamp() > 0;\n}\n";
      }
      const headers = { ...response.headers(), "content-type": "application/javascript" };
      for (const headerName of Object.keys(headers)) {
        if (["content-length", "content-encoding"].includes(headerName.toLowerCase())) {
          delete headers[headerName];
        }
      }
      await route.fulfill({
        status: response.status(),
        headers,
        body
      });
    });

    const judokaGate = await createDeferredResponse(
      page,
      "**/src/data/judoka.json",
      async (route) => {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(judoka.slice(0, 5))
        });
      }
    );

    await page.route("**/src/data/gokyo.json", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(gokyo.slice(0, 5))
      });
    });

    try {
      await page.goto("/src/pages/browseJudoka.html");

      const spinner = page.locator(".loading-spinner");
      await expect(spinner).toBeVisible();

      judokaGate.release();

      await expectBrowseReadiness(page);
      await expect(spinner).toBeHidden();
    } finally {
      await judokaGate.cancel();
      await page.unroute("**/src/data/gokyo.json");
      await page.unroute("**/src/helpers/classicBattle/opponentPromptTracker.js");
    }
  });
}); // Closing brace for test.describe.parallel
