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
  const start = Date.now();
  const deadline = start + timeout;
  // Manual polling avoids rare Playwright waitForFunction edge cases in CI.
  while (Date.now() < deadline) {
    const info = await page.evaluate(() => {
      const d = document.body?.dataset?.battleState || null;
      const w = typeof window !== "undefined" ? window.__classicBattleState || null : null;
      return { d, w };
    });
    if (info.d === stateName || info.w === stateName) return;
    await page.waitForTimeout(25);
  }
  // Timed out: include page-side diagnostics
  let snapshot = "";
  try {
    const info = await page.evaluate(() => {
      const d = document.body?.dataset?.battleState || null;
      const w = typeof window !== "undefined" ? window.__classicBattleState || null : null;
      const el = document.getElementById("machine-state");
      const t = el ? el.textContent : null;
      const prev = document.body?.dataset?.prevBattleState || null;
      const log = Array.isArray(window.__classicBattleStateLog)
        ? window.__classicBattleStateLog.slice(-5)
        : [];
      return { dataset: d, windowState: w, machineText: t, prev, log };
    });
    const tail = Array.isArray(info.log)
      ? info.log.map((e) => `${e.from || 'null'}->${e.to}(${e.event || 'init'})`).join(',')
      : '';
    snapshot = ` (dataset=${info.dataset} window=${info.windowState} machine=${info.machineText} prev=${info.prev} log=[${tail}])`;
  } catch {}
  throw new Error(`Timed out waiting for battle state "${stateName}"${snapshot}`);
}
