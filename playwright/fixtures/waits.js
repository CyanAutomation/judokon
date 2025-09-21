// Common readiness waits for Playwright specs.
import { writeFile, mkdir } from "fs/promises";
import path from "path";
// Keep these helpers minimal and robust for CI environments.

/**
 * Wait until Classic Battle page signals readiness via an in-page promise.
 * @param {import('@playwright/test').Page} page
 */
export async function waitForBattleReady(page) {
  await page.waitForFunction(() => {
    if (window.battleReadyPromise) return true;
    const root = document.querySelector(".home-screen") || document.body;
    if (root?.dataset?.ready === "true") return true;
    const state = document.body?.dataset?.battleState;
    if (typeof state === "string" && state.length > 0) return true;
    const api = window.__TEST_API?.init?.waitForBattleReady;
    return typeof api === "function";
  });
  await page.evaluate(async () => {
    if (window.battleReadyPromise) {
      await window.battleReadyPromise;
      return;
    }

    const root = document.querySelector(".home-screen") || document.body;
    if (root?.dataset?.ready === "true") {
      return;
    }

    if (document.body?.dataset?.battleState) {
      return;
    }

    if (window.__TEST_API?.init?.waitForBattleReady) {
      await window.__TEST_API.init.waitForBattleReady();
      return;
    }

    await new Promise((resolve) => {
      const handler = () => {
        document.removeEventListener("battle:init", handler);
        resolve();
      };
      document.addEventListener("battle:init", handler, { once: true });
      setTimeout(() => {
        document.removeEventListener("battle:init", handler);
        resolve();
      }, 3000);
    });
  });
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
  // Prefer Playwright-side polling to avoid long-lived evaluate sessions
  // that can be torn down when the test ends and produce noisy "Test ended" errors.
  try {
    await page.waitForFunction(
      (s) => {
        const d = document.body?.dataset?.battleState || null;
        let w = null;
        try {
          if (typeof window.getStateSnapshot === "function") {
            w = window.getStateSnapshot().state;
          }
          if (!w) {
            const apiState = window.__TEST_API?.state?.getBattleState?.();
            if (apiState) {
              w = apiState;
            }
          }
          if (!w) {
            const debugState = window.__TEST_API?.inspect?.getDebugInfo?.()?.machine?.currentState;
            if (debugState) {
              w = debugState;
            }
          }
        } catch {}
        return d === s || w === s;
      },
      stateName,
      { timeout }
    );
    return;
  } catch {
    // Fall through to diagnostics below.
  }
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

/**
 * Wait until the UI surfaces the next-round countdown text in the snackbar.
 * Uses text matching on `#snackbar-container` to avoid tight coupling to
 * internal timers or event buses in CI.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=3000]
 */
export async function waitForNextRoundCountdown(page, timeout = 3000) {
  await page.waitForFunction(
    () => {
      const el = document.getElementById("snackbar-container");
      const txt = (el && (el.textContent || "").toLowerCase()) || "";
      return txt.includes("next round in") || txt.includes("next round");
    },
    { timeout }
  );
}

/**
 * Wait for the battle event `nextRoundTimerReady` fired by the cooldown
 * controls in roundManager. Hooks into the page's global EventTarget used by
 * the battle event bus without importing any code into the test context.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=4000]
 */
export async function waitForNextRoundReadyEvent(page, timeout = 4000) {
  await page.waitForFunction(
    () => {
      const KEY = "__classicBattleEventTarget";
      const t = globalThis[KEY];
      if (!t) return false;
      // If the Next button is already marked ready, consider it satisfied.
      try {
        const btn = document.getElementById("next-button");
        if (btn && btn.dataset.nextReady === "true") return true;
      } catch {}
      if (!window.__nextReadySeen && !window.__nextReadyInit) {
        window.__nextReadyInit = true;
        t.addEventListener("nextRoundTimerReady", () => {
          window.__nextReadySeen = true;
        });
      }
      return !!window.__nextReadySeen;
    },
    { timeout }
  );
}
