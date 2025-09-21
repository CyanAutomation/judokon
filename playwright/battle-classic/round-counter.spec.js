import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../../tests/utils/console.js";

test.describe("Classic Battle round counter", () => {
  test("shows Round 1 after start and increments after Next", async ({ page }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        // Speed timers for test: short round and cooldown
        window.__OVERRIDE_TIMERS = { roundTimer: 1 };
        window.__NEXT_ROUND_COOLDOWN_MS = 500;
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html");

      const roundCounter = page.locator("#round-counter");

      // Start the match via modal (pick medium/10)
      await page.waitForSelector("#round-select-2", { state: "visible" });
      await page.click("#round-select-2");

      // Immediately after starting, the round counter should read Round 1
      await expect(roundCounter).toHaveText(/Round\s*1/);

      // Click a stat to resolve the round
      await page.waitForSelector("#stat-buttons button[data-stat]");
      await page.click("#stat-buttons button[data-stat]");

      // Wait for cooldown to start and Next to be ready
      const next = page.locator("#next-button");
      await expect(next).toBeEnabled();
      await expect(next).toHaveAttribute("data-next-ready", "true");

      // Click Next to start the next round and verify increment to Round 2
      await next.click();
      await expect(roundCounter).toHaveText(/Round\s*2/);
      await expect(roundCounter).not.toHaveText(/Round\s*3/);
      // Timer should be visible again for the new round
      await expect(page.locator("#next-round-timer")).toContainText(/Time Left:/);
    }, ["log", "info", "warn", "error", "debug"]);
  });

  test("clicking Next once only advances a single round when ready fires immediately", async ({
    page
  }) => {
    await withMutedConsole(async () => {
      await page.addInitScript(() => {
        window.__OVERRIDE_TIMERS = { roundTimer: 1 };
        window.__NEXT_ROUND_COOLDOWN_MS = 0;
        window.__FF_OVERRIDES = { showRoundSelectModal: true };
      });
      await page.goto("/src/pages/battleClassic.html");

      await page.waitForSelector("#round-select-2", { state: "visible" });
      await page.click("#round-select-2");

      const roundCounter = page.locator("#round-counter");
      await expect(roundCounter).toHaveText(/Round\s*1/);

      await page.waitForSelector("#stat-buttons button[data-stat]");
      await page.click("#stat-buttons button[data-stat]");

      const next = page.locator("#next-button");
      await expect(next).toBeEnabled();
      await expect(next).toHaveAttribute("data-next-ready", "true");

      await next.click();

      const history = await page.evaluate(() => window.__roundCycleHistory || []);
      const startedEvents = history.filter((entry) => entry?.type === "round.start");
      expect(startedEvents).toHaveLength(1);

      await expect
        .poll(async () => {
          const text = await roundCounter.textContent();
          const match = text ? text.match(/Round\s*(\d+)/i) : null;
          return match ? Number.parseInt(match[1], 10) : NaN;
        })
        .toBe(2);
    }, ["log", "info", "warn", "error", "debug"]);
  });
});
