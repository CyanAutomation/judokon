import { expect } from "@playwright/test";

/**
 * Common readiness waits for Playwright specs.
 *
 * @pseudocode
 * - waitForBattleReady: resolves when Classic Battle has initialized (battleReadyPromise).
 * - waitForSettingsReady: resolves when Settings page has initialized (settingsReadyPromise).
 */

/**
 * Wait until Classic Battle page signals readiness.
 * @param {import('@playwright/test').Page} page
 */
export async function waitForBattleReady(page) {
  await page.evaluate(() => window.battleReadyPromise);
}

/**
 * Wait until Settings page signals readiness.
 * @param {import('@playwright/test').Page} page
 */
export async function waitForSettingsReady(page) {
  await page.evaluate(() => window.settingsReadyPromise);
}

/**
 * Wait for the Classic Battle machine to reach a specific state.
 * Uses the in-page `onStateTransition` helper when available, otherwise
 * waits for the `<body>` to expose the state via `data-battle-state`.
 *
 * @pseudocode
 * 1. Evaluate whether `window.onStateTransition` exists on the page.
 * 2. If it does, invoke it with the target state and timeout.
 * 3. Otherwise, expect the body element to have `data-battle-state` equal to `stateName`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} stateName
 * @param {number} [timeout=10000]
 */
export async function waitForBattleState(page, stateName, timeout = 10000) {
  const hasHelper = await page.evaluate(() => typeof window.onStateTransition === "function");
  if (hasHelper) {
    await page.evaluate(({ s, t }) => window.onStateTransition(s, t), { s: stateName, t: timeout });
    return;
  }
  await expect(page.locator("body")).toHaveAttribute("data-battle-state", stateName, {
    timeout
  });
}
