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
      // Poll until the DOM-mirrored state matches
      const start = Date.now();
      const deadline = start + (typeof t === "number" ? t : 10000);
      while (Date.now() < deadline) {
        const d = document.body?.dataset?.battleState || null;
        let w = null;
        if (typeof window.getStateSnapshot === "function") {
          try {
            w = window.getStateSnapshot().state;
          } catch {}
        }
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
    const info = await page.evaluate(async () => {
      const d = document.body?.dataset?.battleState || null;
      let snap = { state: null, log: [] };
      try {
        if (typeof window.getStateSnapshot === "function") {
          snap = window.getStateSnapshot();
        }
      } catch {}
      const el = document.getElementById("machine-state");
      const t = el ? el.textContent : null;
      const prev = document.body?.dataset?.prevBattleState || null;
      const log = Array.isArray(snap.log) ? snap.log.slice(-5) : [];
      return { dataset: d, windowState: snap.state, machineText: t, prev, log };
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
        .evaluate(async () => {
          try {
            if (typeof window.getStateSnapshot === "function") {
              const snap = window.getStateSnapshot();
              return {
                classicState: snap.state,
                stateLog: Array.isArray(snap.log) ? snap.log.slice(-20) : null,
                dataset: document.body?.dataset?.battleState || null,
                prev: document.body?.dataset?.prevBattleState || null
              };
            }
            return null;
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
