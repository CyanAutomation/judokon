import { test, expect } from "./fixtures/commonSetup.js";

/**
 * Verify that the Next button can skip the cooldown when no orchestrator is running.
 *
 * @pseudocode
 * 1. Render a minimal page with a disabled Next button.
 * 2. Start the cooldown via `roundManager.startCooldown`.
 * 3. Ensure `nextRoundTimerReady` fires and the button is enabled with `data-next-ready`.
 * 4. Click the button and await the ready promise to resolve quickly.
 */

test("skips cooldown without orchestrator", async ({ page }) => {
  await page.addInitScript(() => {
    // Long cooldown to ensure click truly skips it
    window.__NEXT_ROUND_COOLDOWN_MS = 5000;
    globalThis.__classicBattleEventTarget = new EventTarget();
  });
  await page.goto("/index.html");
  await page.evaluate(() => {
    document.body.innerHTML =
      '<button id="next-button" data-role="next-round" disabled>Next</button><div id="round-message"></div>';
  });
  await page.evaluate(async () => {
    window.readyEvent = new Promise((resolve) => {
      globalThis.__classicBattleEventTarget.addEventListener(
        "nextRoundTimerReady",
        () => resolve(),
        { once: true }
      );
    });
    const { startCooldown } = await import("/src/helpers/classicBattle/roundManager.js");
    const { onNextButtonClick } = await import("/src/helpers/classicBattle/timerService.js");
    const controls = startCooldown({});
    const btn = document.getElementById("next-button");
    btn.addEventListener("click", (evt) => onNextButtonClick(evt, controls));
    window.readyResolved = false;
    controls.ready.then(() => {
      window.readyResolved = true;
    });
  });
  await page.evaluate(() => window.readyEvent);
  const nextBtn = page.locator("#next-button");
  await expect(nextBtn).toBeEnabled();
  await expect(nextBtn).toHaveAttribute("data-next-ready", "true");
  await nextBtn.click();
  await page.waitForFunction(() => window.readyResolved === true, { timeout: 1000 });
});
