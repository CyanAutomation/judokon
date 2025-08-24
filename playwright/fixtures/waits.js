/**
 * Common readiness waits for Playwright specs.
 *
 * @pseudocode
 * - waitForBattleReady: resolves when Classic Battle has initialized (battleReadyPromise).
 * - waitForSettingsReady: resolves when Settings page has initialized (settingsReadyPromise).
 * - waitForStatButtonsReady: waits for #stat-buttons and data flag.
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
 * Wait for stat buttons to be attached and marked ready.
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=10000]
 */
export async function waitForStatButtonsReady(page, timeout = 10000) {
  await page.waitForSelector("#stat-buttons", { timeout });
  await page.waitForFunction(
    () => document.querySelector("#stat-buttons")?.dataset?.buttonsReady === "true",
    { timeout }
  );
}

