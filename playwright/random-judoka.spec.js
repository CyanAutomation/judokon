import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";

test.describe("View Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/randomJudoka.html");
    await page.locator('body[data-random-judoka-ready="true"]').waitFor();
    await verifyPageBasics(page, [], [], { expectNav: false });
    await expect(page.locator("nav.top-navbar")).toHaveCount(0);
  });

  test("draw controls expose accessible name", async ({ page }) => {
    const drawButton = page.getByRole("button", { name: /draw a random judoka card/i });
    await expect(drawButton).toBeVisible();
    await expect(drawButton).toHaveAttribute("aria-live", /polite/i);
  });

  test("draw button keeps accessible name while busy state toggles", async ({ page }) => {
    const btn = page.getByRole("button", { name: /draw a random judoka card/i });

    await expect(btn).toHaveText(/draw card/i);
    await expect(btn).not.toHaveAttribute("aria-busy");

    await btn.click();
    await expect(btn).toHaveText(/drawing/i);
    await expect(btn).toHaveAttribute("aria-busy", "true", { timeout: 1000 });
    await expect(btn).toHaveAccessibleName(/draw a random judoka card/i);

    await expect(btn).toHaveText(/draw card/i);
    await expect(btn).not.toHaveAttribute("aria-busy");
    await expect(btn).toHaveAccessibleName(/draw a random judoka card/i);
  });

  test("draw card populates container", async ({ page }) => {
    await page.getByRole("button", { name: /draw a random judoka card/i }).click();
    const card = page.getByTestId("card-container").locator(".judoka-card");
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAccessibleName(/card/i);
    const flag = card.locator(".card-top-bar img");
    await expect(flag).toHaveAttribute("alt", /(Portugal|USA|Japan) flag/i);
  });

  test("successive draws render different cards when RNG is stubbed", async ({ page }) => {
    const fixtureJudoka = [
      {
        id: 101,
        firstname: "Aiko",
        surname: "Tanaka",
        country: "Japan",
        countryCode: "jp",
        rarity: "Common",
        weightClass: "-60",
        signatureMoveId: 0,
        stats: {
          power: 4,
          speed: 6,
          technique: 5,
          kumikata: 4,
          newaza: 5
        }
      },
      {
        id: 202,
        firstname: "Miguel",
        surname: "Santos",
        country: "Portugal",
        countryCode: "pt",
        rarity: "Common",
        weightClass: "-66",
        signatureMoveId: 0,
        stats: {
          power: 5,
          speed: 4,
          technique: 6,
          kumikata: 5,
          newaza: 4
        }
      }
    ];

    await page.route("**/src/data/judoka.json", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(fixtureJudoka)
      })
    );

    await page.evaluate(async () => {
      const { setTestMode } = await import("/src/helpers/testModeUtils.js");
      setTestMode({ enabled: true, seed: 2 });
    });

    const drawButton = page.getByRole("button", { name: /draw a random judoka card/i });
    const cardName = page.locator(".card-name");
    const historyItems = page.locator("#history-panel .history-list li");

    await drawButton.click();
    await expect(cardName).toHaveAttribute("aria-label", "Miguel Santos");
    await expect(historyItems).toHaveText(["Miguel Santos"]);

    await drawButton.click();
    await expect(cardName).toHaveAttribute("aria-label", "Aiko Tanaka");
    await expect(historyItems).toHaveText(["Aiko Tanaka", "Miguel Santos"]);
  });

  test("shows error state with accessible messaging when preload fails", async ({ page }) => {
    await page.route("**/src/data/judoka.json", (route) => route.abort("failed"));
    await page.route("**/src/data/gokyo.json", (route) => route.abort("failed"));

    await page.reload();
    await page.locator("body[data-random-judoka-ready]").waitFor();

    const drawButton = page.getByRole("button", { name: /draw a random judoka card/i });
    await expect(drawButton).toBeDisabled();
    await expect(drawButton).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("alert")).toHaveText(/unable to load judoka data/i);
  });

  test("falls back to default card when deck is empty", async ({ page }) => {
    await page.route("**/src/data/judoka.json", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: "[]"
      })
    );

    await page.reload();
    await page.locator('body[data-random-judoka-ready="true"]').waitFor();

    const drawButton = page.getByRole("button", { name: /draw a random judoka card/i });
    await drawButton.click();

    const card = page.getByTestId("card-container").locator(".judoka-card");
    await expect(card).toHaveAccessibleName(/Tatsuuma Ushiyama card/i);
  });

  test("draw button remains within viewport", async ({ page }) => {
    const btn = page.getByRole("button", { name: /draw a random judoka card/i });
    const { bottom, innerHeight } = await btn.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { bottom: rect.bottom, innerHeight: window.innerHeight };
    });
    const ALLOWED_OFFSET = 10;
    expect(bottom).toBeLessThanOrEqual(innerHeight + ALLOWED_OFFSET);
  });

  test("history panel toggles via keyboard with focus restored", async ({ page }) => {
    const historyBtn = page.locator("#toggle-history-btn");
    const historyPanel = page.locator("#history-panel");

    await expect(historyBtn).toHaveAccessibleName(/history/i);
    await historyBtn.press("Enter");
    await expect(historyPanel).toHaveAttribute("open", "");
    await expect(historyBtn).toBeFocused();

    await page.press("body", "Escape");
    await expect(historyPanel).not.toHaveAttribute("open");
    await expect(historyBtn).toBeFocused();
  });
});
