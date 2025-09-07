import { test, expect } from "@playwright/test";

test.describe("Classic Battle cooldown + Next", () => {
  test("Next becomes ready after resolution and advances on click", async ({ page }) => {
    await page.addInitScript(() => {
      // Speed up timers during e2e: 1s round, 1s cooldown
      window.__OVERRIDE_TIMERS = { roundTimer: 1 };
      window.__NEXT_ROUND_COOLDOWN_MS = 1000;
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal (pick medium/10)
    await page.waitForSelector("#round-select-2", { state: "visible" });
    await page.click("#round-select-2");

    // Wait for short round timer to expire and trigger cooldown
    await page.waitForTimeout(1200);

    // Next should be enabled and marked ready during cooldown
    const next = page.locator("#next-button");
    await expect(next).toBeEnabled();
    await expect(next).toHaveAttribute("data-next-ready", "true");

    // Grab controls and ready promise from the page context
    const hadControls = await page.evaluate(async () => {
      const mod = await import("/src/helpers/classicBattle/roundManager.js");
      const controls = mod.getNextRoundControls?.();
      return !!(controls && controls.ready);
    });
    expect(hadControls).toBeTruthy();

    // Click Next and ensure it resolves the ready promise
    // We can't await a promise from the page directly; instead, mark a flag
    const resolved = await page.evaluate(async () => {
      const { getNextRoundControls } = await import("/src/helpers/classicBattle/roundManager.js");
      const { onNextButtonClick } = await import("/src/helpers/classicBattle/timerService.js");
      const controls = getNextRoundControls();
      let done = false;
      controls.ready.then(() => {
        done = true;
      });
      await onNextButtonClick(new MouseEvent("click"), controls);
      // Give the resolver a moment to flip the flag
      await new Promise((r) => setTimeout(r, 10));
      return done;
    });
    expect(resolved).toBeTruthy();
  });
});
