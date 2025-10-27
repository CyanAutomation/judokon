// Common readiness waits for Playwright specs.
import { writeFile, mkdir } from "fs/promises";
import path from "path";
// Keep these helpers minimal and robust for CI environments.

const WAIT_HELPER_ERROR_PREFIX = "wait-helper";

async function callTestApiMethod(page, pathSegments, args = []) {
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    throw new Error(`${WAIT_HELPER_ERROR_PREFIX}: invalid Test API path segments`);
  }

  const { ok, value, error } = await page.evaluate(
    ({ segments, args: callArgs }) => {
      const root = window.__TEST_API;
      if (!root) {
        return { ok: false, value: null, error: "window.__TEST_API unavailable" };
      }

      let context = root;
      for (let index = 0; index < segments.length - 1; index += 1) {
        context = context?.[segments[index]];
        if (context === null || typeof context === "undefined") {
          return {
            ok: false,
            value: null,
            error: `__TEST_API segment missing: ${segments.slice(0, index + 1).join(".")}`
          };
        }
      }

      const fnName = segments[segments.length - 1];
      const callable = context?.[fnName];
      if (typeof callable !== "function") {
        return { ok: false, value: null, error: `__TEST_API.${segments.join(".")} not callable` };
      }

      return Promise.resolve()
        .then(() => callable.apply(context, callArgs))
        .then(
          (result) => ({ ok: true, value: result ?? null, error: null }),
          (thrown) => ({
            ok: false,
            value: null,
            error:
              thrown instanceof Error
                ? thrown.message
                : typeof thrown === "object" && thrown !== null && "message" in thrown
                  ? String(thrown.message)
                  : String(thrown ?? "Unknown error")
          })
        );
    },
    { segments: pathSegments, args }
  );

  return { ok, value, error };
}

async function readBattleReadinessDiagnostics(page) {
  return await page.evaluate(() => {
    const datasetReady = document.body?.dataset?.ready ?? null;
    const datasetBattleState = document.body?.dataset?.battleState ?? null;
    const apiState = (() => {
      try {
        return window.__TEST_API?.state?.getBattleState?.() ?? null;
      } catch {
        return null;
      }
    })();
    const isReady = (() => {
      try {
        return window.__TEST_API?.init?.isBattleReady?.() ?? null;
      } catch {
        return null;
      }
    })();
    const debugInfo = (() => {
      try {
        return window.__TEST_API?.inspect?.getDebugInfo?.() ?? null;
      } catch {
        return null;
      }
    })();

    const machineState = debugInfo?.machine?.currentState ?? null;
    const orchestratorAttached = Boolean(debugInfo?.store?.orchestrator ?? window.battleStore?.orchestrator);

    return {
      datasetReady,
      datasetBattleState,
      apiState,
      machineState,
      orchestratorAttached,
      isReady,
      timestamp: Date.now()
    };
  });
}

function normalizeBrowseSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return { isReady: false, cardCount: 0 };
  }

  const cardCount = Number(snapshot.cardCount);
  return {
    isReady: Boolean(snapshot.isReady),
    cardCount: Number.isFinite(cardCount) ? cardCount : 0
  };
}

async function readBrowseDiagnostics(page) {
  return await page.evaluate(() => {
    const container = document.querySelector("[data-testid='carousel-container']");
    const cards = container ? Array.from(container.querySelectorAll(".judoka-card")).length : 0;
    const busy = container?.getAttribute("aria-busy") ?? null;
    const spinnerVisible = Boolean(document.querySelector(".loading-spinner"));
    const initSnapshot = (() => {
      try {
        return window.__TEST_API?.init?.getBrowseReadySnapshot?.() ?? null;
      } catch {
        return null;
      }
    })();

    return {
      cards,
      busy,
      spinnerVisible,
      initSnapshot,
      timestamp: Date.now()
    };
  });
}

async function readBattleStateWindowDiagnostics(page) {
  return await page.evaluate(() => {
    const datasetState = document.body?.dataset?.battleState ?? null;
    const previousState = document.body?.dataset?.prevBattleState ?? null;
    const machineText = document.getElementById("machine-state")?.textContent ?? null;
    const snapshot = (() => {
      try {
        return typeof window.getStateSnapshot === "function" ? window.getStateSnapshot() : null;
      } catch {
        return null;
      }
    })();
    const apiState = (() => {
      try {
        return window.__TEST_API?.state?.getBattleState?.() ?? null;
      } catch {
        return null;
      }
    })();
    const debugInfo = (() => {
      try {
        return window.__TEST_API?.inspect?.getDebugInfo?.() ?? null;
      } catch {
        return null;
      }
    })();
    const logTail = Array.isArray(snapshot?.log)
      ? snapshot.log.slice(-5).map((entry) => ({
          from: entry?.from ?? null,
          to: entry?.to ?? null,
          event: entry?.event ?? null
        }))
      : [];

    return {
      datasetState,
      previousState,
      machineText,
      snapshotState: snapshot?.state ?? null,
      apiState,
      machineState: debugInfo?.machine?.currentState ?? null,
      logTail,
      timestamp: Date.now()
    };
  });
}

async function captureBattleStateArtifacts(page, stateName) {
  const artifacts = { screenshotPath: null, htmlPath: null, jsonPath: null };
  try {
    const outDir = path.resolve(process.cwd(), "test-results");
    await mkdir(outDir, { recursive: true });
    const ts = Date.now();
    const base = `waitForBattleState-${stateName}-${ts}`;

    try {
      const shotPath = path.join(outDir, `${base}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
      artifacts.screenshotPath = shotPath;
    } catch {}

    try {
      const html = await page.content();
      if (html) {
        const htmlPath = path.join(outDir, `${base}.html`);
        await writeFile(htmlPath, html, "utf8");
        artifacts.htmlPath = htmlPath;
      }
    } catch {}

    try {
      const windowState = await page.evaluate(() => {
        try {
          if (typeof window.getStateSnapshot === "function") {
            const snap = window.getStateSnapshot();
            return {
              classicState: snap?.state ?? null,
              stateLog: Array.isArray(snap?.log) ? snap.log.slice(-20) : null,
              dataset: document.body?.dataset?.battleState ?? null,
              prev: document.body?.dataset?.prevBattleState ?? null
            };
          }
        } catch {}
        return null;
      });
      if (windowState) {
        const jsonPath = path.join(outDir, `${base}.json`);
        await writeFile(jsonPath, JSON.stringify(windowState, null, 2), "utf8");
        artifacts.jsonPath = jsonPath;
      }
    } catch {}
  } catch {}

  return artifacts;
}

async function collectBattleStateDiagnostics(page, stateName) {
  const windowDiagnostics = await readBattleStateWindowDiagnostics(page);
  const artifacts = await captureBattleStateArtifacts(page, stateName);
  return { ...windowDiagnostics, ...artifacts };
}

/**
 * Wait until Classic Battle page signals readiness via the Test API bridge.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ timeout?: number }} [options]
 * @returns {Promise<{ ok: boolean, timedOut: boolean, reason: string | null, payload: unknown, diagnostics: object | null }>}
 * Structured readiness payload from the Test API.
 * @pseudocode
 * 1. CALL the Test API bridge for `init.waitForBattleReady(timeout)`.
 * 2. IF the API reports readiness, return a success payload.
 * 3. OTHERWISE collect readiness diagnostics and return a structured failure payload.
 */
export async function waitForBattleReady(page, { timeout = 10_000 } = {}) {
  const { ok, value, error } = await callTestApiMethod(page, ["init", "waitForBattleReady"], [timeout]);

  if (!ok) {
    const diagnostics = await readBattleReadinessDiagnostics(page);
    return {
      ok: false,
      timedOut: false,
      reason: error ?? "init.waitForBattleReady failed",
      payload: null,
      diagnostics
    };
  }

  if (value === true) {
    return {
      ok: true,
      timedOut: false,
      reason: null,
      payload: true,
      diagnostics: null
    };
  }

  const diagnostics = await readBattleReadinessDiagnostics(page);
  return {
    ok: false,
    timedOut: true,
    reason: "Battle readiness timed out via Test API",
    payload: value ?? null,
    diagnostics
  };
}

/**
 * Wait until the Browse Judoka carousel publishes its readiness snapshot.
 * @param {import('@playwright/test').Page} page
 * @param {{ timeout?: number }} [options]
 * @returns {Promise<{ ok: boolean, timedOut: boolean, reason: string | null, snapshot: { isReady: boolean, cardCount: number } | null, diagnostics: object | null }>}
 * @pseudocode
 * 1. CALL `init.waitForBrowseReady` through the Test API bridge with the provided timeout.
 * 2. IF the snapshot reports readiness, resolve with success and the readiness payload.
 * 3. OTHERWISE TRY `browse.whenCarouselReady`; if both fail, attach diagnostics and return failure.
 */
export async function waitForBrowseReady(page, { timeout = 10_000 } = {}) {
  const primary = await callTestApiMethod(page, ["init", "waitForBrowseReady"], [timeout]);
  if (primary.ok) {
    const snapshot = normalizeBrowseSnapshot(primary.value);
    if (snapshot.isReady) {
      return {
        ok: true,
        timedOut: false,
        reason: null,
        snapshot,
        diagnostics: null
      };
    }

    const diagnostics = await readBrowseDiagnostics(page);
    return {
      ok: false,
      timedOut: true,
      reason: "Browse readiness timed out via init.waitForBrowseReady",
      snapshot,
      diagnostics
    };
  }

  const fallback = await callTestApiMethod(page, ["browse", "whenCarouselReady"], [{ timeout }]);
  if (fallback.ok) {
    const snapshot = normalizeBrowseSnapshot(fallback.value);
    if (snapshot.isReady) {
      return {
        ok: true,
        timedOut: false,
        reason: null,
        snapshot,
        diagnostics: null
      };
    }

    const diagnostics = await readBrowseDiagnostics(page);
    return {
      ok: false,
      timedOut: true,
      reason: "Browse readiness timed out via browse.whenCarouselReady",
      snapshot,
      diagnostics
    };
  }

  const diagnostics = await readBrowseDiagnostics(page);
  return {
    ok: false,
    timedOut: false,
    reason:
      fallback.error ?? primary.error ?? "Browse readiness Test API is unavailable in this context",
    snapshot: null,
    diagnostics
  };
}

/**
 * Wait until Settings page signals readiness via an in-page promise.
 * @param {import('@playwright/test').Page} page
 */
export async function waitForSettingsReady(page) {
  await page.evaluate(() => window.settingsReadyPromise);
}

/**
 * Wait for the Classic Battle machine to reach a specific state via the Test API.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} stateName
 * @param {number} [timeout=10000]
 * @returns {Promise<{ ok: boolean, timedOut: boolean, reason: string | null, state: string | null, diagnostics: object | null }>}
 * @pseudocode
 * 1. CALL `state.waitForBattleState` through the Test API bridge.
 * 2. IF the state resolves, return a success payload.
 * 3. OTHERWISE capture window diagnostics and artifact paths, returning a structured failure payload.
 */
export async function waitForBattleState(page, stateName, timeout = 10000) {
  const result = await callTestApiMethod(page, ["state", "waitForBattleState"], [stateName, timeout]);

  if (result.ok && result.value === true) {
    return {
      ok: true,
      timedOut: false,
      reason: null,
      state: stateName,
      diagnostics: null
    };
  }

  const diagnostics = await collectBattleStateDiagnostics(page, stateName);
  if (!result.ok) {
    return {
      ok: false,
      timedOut: false,
      reason: result.error ?? `waitForBattleState failed for "${stateName}"`,
      state: diagnostics.apiState ?? diagnostics.datasetState ?? null,
      diagnostics
    };
  }

  return {
    ok: false,
    timedOut: true,
    reason: `Timed out waiting for battle state "${stateName}" via Test API`,
    state: diagnostics.apiState ?? diagnostics.datasetState ?? null,
    diagnostics
  };
}

/**
 * Wait for a snackbar to appear with specific text content.
 * @param {import('@playwright/test').Page} page
 * @param {string} [expectedText] - Optional text to match in the snackbar
 * @param {number} [timeout=5000]
 */
export async function waitForSnackbar(page, expectedText, timeout = 5000) {
  await page.waitForFunction(
    (text) => {
      const el = document.getElementById("snackbar-container");
      if (!el) return false;
      const content = el.textContent || "";
      if (text) {
        return content.toLowerCase().includes(text.toLowerCase());
      }
      return content.trim().length > 0;
    },
    expectedText,
    { timeout }
  );
}

/**
 * Wait for a modal to be open and visible.
 * @param {import('@playwright/test').Page} page
 * @param {string} [modalSelector="#match-end-modal"] - CSS selector for the modal
 * @param {number} [timeout=5000]
 */
export async function waitForModalOpen(page, modalSelector = "#match-end-modal", timeout = 5000) {
  await page.waitForFunction(
    (selector) => {
      const modal = document.querySelector(selector);
      if (!modal) return false;
      // Check if modal is visible (not hidden by aria-hidden or CSS)
      const ariaHidden = modal.getAttribute("aria-hidden");
      if (ariaHidden === "true") return false;
      // Check if it's not hidden by CSS
      const style = window.getComputedStyle(modal);
      return style.display !== "none" && style.visibility !== "hidden";
    },
    modalSelector,
    { timeout }
  );
}

/**
 * Wait for a countdown to start or reach a specific value.
 * @param {import('@playwright/test').Page} page
 * @param {string|number} [expectedValue] - Expected countdown value or text
 * @param {number} [timeout=10000]
 */
export async function waitForCountdown(page, expectedValue, timeout = 10000) {
  await page.waitForFunction(
    (value) => {
      const logParseFailure = (raw) => {
        if (console?.debug)
          console.debug(`[waitForCountdown] Failed to parse as integer: "${raw}"`);
      };
      const toInt = (raw) => {
        if (raw === null || raw === undefined) return null;
        const parsed = parseInt(raw, 10);
        if (Number.isNaN(parsed)) {
          logParseFailure(raw);
          return null;
        }
        return parsed;
      };
      const getRemainingTime = (element) =>
        element?.getAttribute("data-remaining-time") ?? element?.dataset?.remainingTime ?? null;
      const compareValues = (actual, expected, expectedNumber) => {
        const actualNumber = toInt(actual);
        return actualNumber !== null && expectedNumber !== null
          ? actualNumber === expectedNumber
          : actual === String(expected);
      };
      const extractCountdownFromText = (text) => {
        if (!text) return null;
        const normalized = text.replace(/\s+/g, " ");
        const patterns = [
          /\b(?:in|:)\s*(\d{1,3})\s*(?:s(?:ec(?:onds?)?)?)?\b/i,
          /\b(\d{1,3})\s*(?:s(?:ec(?:onds?)?)?)\b/i
        ];
        for (const pattern of patterns) {
          const match = normalized.match(pattern);
          if (match) {
            return match[1];
          }
        }
        return null;
      };
      const expectedNumber = value === undefined ? null : toInt(value);
      const verifyCountdownMatch = (actualValue) => {
        if (value === undefined) return actualValue !== null;
        if (actualValue === null) return false;
        return compareValues(actualValue, value, expectedNumber);
      };
      const checkCliCountdown = () => {
        const cliCountdown = document.getElementById("cli-countdown");
        if (!cliCountdown) return false;
        const dataRemaining = getRemainingTime(cliCountdown);
        if (dataRemaining !== null && verifyCountdownMatch(dataRemaining)) return true;
        const textValue = extractCountdownFromText(cliCountdown.textContent || "");
        return textValue !== null && verifyCountdownMatch(textValue);
      };
      const checkBattleTimer = () => {
        const timerEl = document.querySelector('[data-testid="next-round-timer"]');
        if (!timerEl) return false;
        const textValue = extractCountdownFromText(timerEl.textContent || "");
        return textValue !== null && verifyCountdownMatch(textValue);
      };
      return checkCliCountdown() || checkBattleTimer();
    },
    expectedValue,
    { timeout }
  );
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
