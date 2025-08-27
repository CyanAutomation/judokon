// Common readiness waits for Playwright specs.
// Keep these helpers minimal and robust for CI environments.

/**
 * Wait until Classic Battle page signals readiness via an in-page promise.
 * @param {import('@playwright/test').Page} page
 */
export async function waitForBattleReady(page) {
  await page.evaluate(() => window.battleReadyPromise);
}

/**
 * Wait until Settings page signals readiness via an in-page promise.
 * @param {import('@playwright/test').Page} page
 */
export async function waitForSettingsReady(page) {
  await page.evaluate(() => window.settingsReadyPromise);
}

/**
 * Wait for the Classic Battle machine to reach a specific state.
 * This implementation uses a DOM-based fallback: the page writes the
 * current state to <body data-battle-state="...">. Avoid calling into
 * in-page helpers which can cause page.evaluate crashes in some CI
 * environments.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} stateName
 * @param {number} [timeout=10000]
 */
export async function waitForBattleState(page, stateName, timeout = 10000) {
  try {
    await page.waitForFunction(
      (s) => {
        const d = document.body?.dataset?.battleState;
        const w = typeof window !== "undefined" ? window.__classicBattleState : null;
        return d === s || w === s;
      },
      stateName,
      { timeout }
    );
  } catch (err) {
    // Enrich error with in-page diagnostics without changing the expected prefix.
    let snapshot = "";
    try {
      const info = await page.evaluate(() => {
        const d = document.body?.dataset?.battleState || null;
        const w = typeof window !== "undefined" ? window.__classicBattleState || null : null;
        const el = document.getElementById("machine-state");
        const t = el ? el.textContent : null;
        const prev = document.body?.dataset?.prevBattleState || null;
        return { dataset: d, windowState: w, machineText: t, prev };
      });
      snapshot = ` (dataset=${info.dataset} window=${info.windowState} machine=${info.machineText} prev=${info.prev})`;
    } catch {}
    throw new Error(`Timed out waiting for battle state "${stateName}"${snapshot}`);
  }
}
