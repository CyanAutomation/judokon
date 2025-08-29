// Common readiness waits for Playwright specs.
import { writeFile, mkdir } from "fs/promises";
import path from "path";
// Keep these helpers minimal and robust for CI environments.

/**
 * Wait until Classic Battle page signals readiness via an in-page promise.
 * @param {import('@playwright/test').Page} page
 */
export async function waitForBattleReady(page) {
  await page.waitForFunction(() => window.battleReadyPromise);
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
  const ok = await page.evaluate(
    async (args) => {
      const s = args.stateName;
      const t = args.timeout;
      try {
        if (typeof window.awaitBattleState === "function") {
          await window.awaitBattleState(s, t);
          return true;
        }
      } catch {}
      // Fallback: poll
      const start = Date.now();
      const deadline = start + (typeof t === "number" ? t : 10000);
      while (Date.now() < deadline) {
        const d = document.body?.dataset?.battleState || null;
        let w = null;
        try {
          const raw = typeof window !== "undefined" ? window.__classicBattleState : null;
          if (typeof raw === "string") w = raw;
          else if (raw && typeof raw.state === "string") w = raw.state;
        } catch {}
        if (d === s || w === s) return true;
        await new Promise((r) => setTimeout(r, 25));
      }
      return false;
    },
    { stateName, timeout }
  );
  if (ok) return;
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
      ? info.log.map((e) => `${e.from || "null"}->${e.to}(${e.event || "init"})`).join(",")
      : "";
    snapshot = ` (dataset=${info.dataset} window=${info.windowState} machine=${info.machineText} prev=${info.prev} log=[${tail}])`;
  } catch {}
  // Try to save helpful artifacts to test-results/ for offline inspection.
  try {
    const outDir = path.resolve(process.cwd(), "test-results");
    await mkdir(outDir, { recursive: true });
    const ts = Date.now();
    // Screenshot
    try {
      const shotPath = path.join(outDir, `waitForBattleState-${stateName}-${ts}.png`);
      await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
      snapshot += ` screenshot=${shotPath}`;
    } catch {}
    // HTML dump
    try {
      const html = await page.content().catch(() => null);
      if (html) {
        const htmlPath = path.join(outDir, `waitForBattleState-${stateName}-${ts}.html`);
        await writeFile(htmlPath, html, "utf8").catch(() => {});
        snapshot += ` html=${htmlPath}`;
      }
    } catch {}
    // Window-side JSON snapshot
    try {
      const win = await page
        .evaluate(() => {
          try {
            return {
              classicState:
                typeof window.__classicBattleState !== "undefined"
                  ? window.__classicBattleState
                  : null,
              stateLog: Array.isArray(window.__classicBattleStateLog)
                ? window.__classicBattleStateLog.slice(-20)
                : null,
              dataset: document.body?.dataset?.battleState || null,
              prev: document.body?.dataset?.prevBattleState || null
            };
          } catch {
            return null;
          }
        })
        .catch(() => null);
      if (win) {
        const jsonPath = path.join(outDir, `waitForBattleState-${stateName}-${ts}.json`);
        await writeFile(jsonPath, JSON.stringify(win, null, 2), "utf8").catch(() => {});
        snapshot += ` json=${jsonPath}`;
      }
    } catch {}
  } catch {}

  throw new Error(`Timed out waiting for battle state "${stateName}"${snapshot}`);
}
