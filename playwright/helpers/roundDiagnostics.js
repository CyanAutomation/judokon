/**
 * @typedef {Object} RoundDiagnostics
 * @property {string} text - Text content of the round counter element.
 * @property {number|null} displayedRound - Parsed round number from the counter text.
 * @property {string|null} highestAttr - Raw highest round dataset attribute.
 * @property {number|null} highestAttrNumber - Numeric version of the dataset attribute when available.
 * @property {number|null} highestGlobal - Highest round tracked via global diagnostic state.
 * @property {string|null} lastContext - Most recent context applied when rendering the counter.
 * @property {string|null} previousContext - Context applied before the most recent update.
 * @property {number|null} roundsPlayed - Total resolved rounds reported by the store diagnostics.
 * @property {boolean|null} selectionMade - Whether a stat was selected for the active round.
 * @property {string|null} machineState - Current finite state machine state (diagnostic only).
 * @property {string|null} snapshotState - Snapshot state from diagnostics.
 * @property {string|null} apiState - Battle state reported by the public Test API.
 * @property {unknown} error - Any diagnostic error emitted by the inspect helper.
 */

const ROUND_PATTERN = /Round\s*(\d+)/i;

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseRoundLabel(text) {
  if (!text) {
    return null;
  }

  const match = String(text).match(ROUND_PATTERN);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Read detailed round counter diagnostics using the Playwright evaluate bridge.
 *
 * @param {import('@playwright/test').Page} page - Active Playwright page instance.
 * @returns {Promise<RoundDiagnostics>} Diagnostic snapshot of the round counter state.
 * @pseudocode
 * 1. Evaluate in the browser context to collect DOM + diagnostic globals.
 * 2. Normalize nullable numbers so absent state stays `null`.
 * 3. Parse the round counter label for a numeric round value.
 * 4. Return the aggregated diagnostic payload for assertions.
 */
export async function readRoundDiagnostics(page) {
  const diagnostics = await page.evaluate(() => {
    const counter = document.getElementById("round-counter");
    const text = counter ? String(counter.textContent ?? "") : "";
    const debug = window.__TEST_API?.inspect?.getDebugInfo?.();
    const stateApiState = window.__TEST_API?.state?.getBattleState?.() ?? null;

    return {
      text,
      highestAttr: counter?.dataset?.highestRound ?? null,
      highestGlobal: window.__highestDisplayedRound ?? null,
      lastContext: (() => {
        const context =
          typeof window.__lastRoundCounterContext === "string"
            ? window.__lastRoundCounterContext
            : null;
        if (context) {
          return context;
        }
        if (window.__classicBattleLastFinalizeContext) {
          return window.__classicBattleLastFinalizeContext;
        }
        if (window.__classicBattleSelectionFinalized === true) {
          return "advance";
        }
        return null;
      })(),
      previousContext:
        typeof window.__previousRoundCounterContext === "string"
          ? window.__previousRoundCounterContext
          : null,
      roundsPlayed: debug?.store?.roundsPlayed ?? null,
      selectionMade: debug?.store?.selectionMade ?? null,
      machineState: debug?.machine?.currentState ?? null,
      snapshotState: debug?.snapshot?.state ?? null,
      apiState: typeof stateApiState === "string" ? stateApiState : null,
      error: debug?.error ?? null
    };
  });

  return {
    ...diagnostics,
    displayedRound: parseRoundLabel(diagnostics.text),
    highestAttrNumber: toOptionalNumber(diagnostics.highestAttr),
    highestGlobal: toOptionalNumber(diagnostics.highestGlobal),
    roundsPlayed: toOptionalNumber(diagnostics.roundsPlayed),
    selectionMade: typeof diagnostics.selectionMade === "boolean" ? diagnostics.selectionMade : null
  };
}
