import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";
import { waitForBrowseReady } from "./fixtures/waits.js";
import judoka from "../tests/fixtures/judoka.json" with { type: "json" };
import countryCodeMapping from "../src/data/countryCodeMapping.json" with { type: "json" };

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

  test("follows the browse journey and keeps card details consistent", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });

    const toggle = page.getByTestId(COUNTRY_TOGGLE_LOCATOR);
    const panel = page.getByRole("region", { name: /country filter panel/i, hidden: true });
    const cards = page.getByTestId(JUDOKA_CARD);

    const readiness = await expectBrowseReadiness(page);
    const initialCount = readiness.snapshot?.cardCount ?? (await cards.count());

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-label", /country filter/i);
    await expect(panel).toBeHidden();

    await toggle.click();
    await expect(panel).toBeVisible();

    await page.addStyleTag({
      content: ".country-flag-slide-track { animation: none !important; }"
    });
    const countryOptions = page.getByTestId(COUNTRY_FLAG_OPTION);
    await expect(countryOptions).toHaveCount(EXPECTED_COUNTRY_SLIDE_COUNT);
    await expect(countryOptions.first().locator("img")).toHaveAttribute("alt", /all countries/i);

    const japanOption = countryOptions.filter({ hasText: /japan/i }).first();
    await japanOption.click();
    await expect(panel).toBeHidden();

    const filteredCards = page.getByTestId(JUDOKA_CARD);
    await expect(filteredCards).toHaveCount(1);

    const japanCard = filteredCards.first();
    const cardButton = japanCard.getByRole("button", { name: /Shōzō Fujii card/i });
    await expect(cardButton).toBeVisible();
    await expect(japanCard.locator(".card-top-bar img")).toHaveAttribute("alt", /japan flag/i);

    const nameContainer = japanCard.locator(".card-name");
    await expect(nameContainer).toHaveAttribute("aria-label", /Shōzō\s+Fujii/i);
    await expect(nameContainer.locator(".firstname")).toHaveText("Shōzō");
    await expect(nameContainer.locator(".surname")).toHaveText("Fujii");

    const stats = japanCard.locator(".card-stats .stat");
    await expect(stats).toHaveCount(5);
    await expect(stats.filter({ hasText: /Power/i }).first()).toHaveText(/Power\s*8/);
    await expect(stats.filter({ hasText: /Speed/i }).first()).toHaveText(/Speed\s*8/);
    await expect(stats.filter({ hasText: /Technique/i }).first()).toHaveText(/Technique\s*8/);
    await expect(stats.filter({ hasText: /Kumi-kata/i }).first()).toHaveText(/Kumi-kata\s*7/);
    await expect(stats.filter({ hasText: /Ne-waza/i }).first()).toHaveText(/Ne-waza\s*8/);

    await toggle.click();
    await expect(panel).toBeVisible();
    await page.getByTestId("clear-filter").click();
    await expect(page.getByRole("radio", { name: "All" })).toBeChecked();
    await expect(cards).toHaveCount(initialCount);

    const carousel = page.getByTestId("carousel");
    const markers = page.locator(".scroll-marker");
    const counter = page.locator(".page-counter");
    const left = page.getByRole("button", { name: /prev\.?/i });
    const right = page.getByRole("button", { name: /next/i });

    await carousel.focus();
    const pageCount = await markers.count();
    expect(pageCount).toBeGreaterThan(1);
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
}); // Closing brace for test.describe.parallel
