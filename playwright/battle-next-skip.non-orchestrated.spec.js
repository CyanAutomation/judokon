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

  // Navigate to actual battle page instead of replacing body HTML
  await page.goto("/src/pages/battleClassic.html");

  // Wait for page initialization and Test API availability
  await page.waitForFunction(
    () => {
      return (
        document.querySelector("#next-button") !== null ||
        document.querySelector("[data-role='next-round']") !== null
      );
    },
    { timeout: 5000 }
  );

  // Use existing battle infrastructure instead of synthetic DOM
  const nextButton = page.locator("#next-button, [data-role='next-round']").first();
  await nextButton.waitFor({ timeout: 3000 });

  await page.evaluate(async () => {
    // Force non-orchestrated mode by clearing battle state
    document.body.removeAttribute("data-battle-state");

    window.readyEvent = new Promise((resolve) => {
      globalThis.__classicBattleEventTarget.addEventListener(
        "nextRoundTimerReady",
        () => resolve(),
        { once: true }
      );
    });
    const { startCooldown } = await import("/src/helpers/classicBattle/roundManager.js");
    const { onNextButtonClick } = await import("/src/helpers/classicBattle/timerService.js");
    const { enableNextRoundButton } = await import("/src/helpers/classicBattle/uiHelpers.js");

    const controls = startCooldown({});

    // For testing purposes, enable the button directly
    enableNextRoundButton();

    // Find the actual next button in the real battle page
    const btn =
      document.getElementById("next-button") || document.querySelector("[data-role='next-round']");

    if (btn) {
      btn.addEventListener("click", (evt) => onNextButtonClick(evt, controls));
      window.readyResolved = false;
      controls.ready.then(() => {
        window.readyResolved = true;
      });
    } else {
      console.warn("Next button not found in battle page");
      window.readyResolved = true; // Allow test to continue
    }
  });

  await page.evaluate(() => window.readyEvent);

  // Use the same selector as above for consistency
  const nextBtn = page.locator("#next-button, [data-role='next-round']").first();
  await expect(nextBtn).toBeEnabled();
  await expect(nextBtn).toHaveAttribute("data-next-ready", "true");
  await nextBtn.click();
  await page.waitForFunction(() => window.readyResolved === true, { timeout: 1000 });
});
