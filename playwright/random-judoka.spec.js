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
    await page.evaluate(async () => {
      const { setTestMode } = await import("/src/helpers/testModeUtils.js");
      setTestMode(false);

      const sequence = [0.1, 0.9];
      let idx = 0;
      const originalRandom = Math.random;
      Math.random = () => sequence[idx++ % sequence.length];

      // Restore after test completes
      page.on("close", () => {
        Math.random = originalRandom;
      });
    });

    const drawButton = page.getByRole("button", { name: /draw a random judoka card/i });

    await drawButton.click();
    const firstCard = page.getByTestId("card-container").locator(".judoka-card").first();
    await expect(firstCard).toHaveAccessibleName(/card/i);
    const firstName = await firstCard.getAttribute("aria-label");

    await expect(drawButton).toHaveText(/draw card/i);
    await drawButton.click();
    const secondCard = page.getByTestId("card-container").locator(".judoka-card").first();
    await expect(secondCard).toHaveAccessibleName(/card/i);
    const secondName = await secondCard.getAttribute("aria-label");

    expect(secondName).not.toEqual(firstName);
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
