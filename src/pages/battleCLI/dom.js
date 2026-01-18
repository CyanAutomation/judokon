import * as engineFacade from "../../helpers/battleEngineFacade.js";

// Phase 4: Simplified scoreboard helpers - now primarily rely on shared Scoreboard adapter
// Dynamic import kept for fallback scenarios only
let sharedScoreboardHelpers = null;
let sharedScoreboardReady = Promise.resolve(null);
let verboseScrollListenerAttached = false;
let verboseResizeListenerAttached = false;

const assignSharedScoreboardHelpers = (module) => {
  sharedScoreboardHelpers = {
    showMessage: module.showMessage,
    updateScore: module.updateScore,
    updateRoundCounter: module.updateRoundCounter
  };
  return sharedScoreboardHelpers;
};

try {
  sharedScoreboardReady = import("../../components/Scoreboard.js")
    .then((module) => assignSharedScoreboardHelpers(module))
    .catch(() => {
      // Graceful fallback if shared Scoreboard not available or methods missing
      sharedScoreboardHelpers = null;
      return null;
    });
} catch {
  // Graceful fallback if shared Scoreboard not available
  sharedScoreboardReady = Promise.resolve(null);
}

/**
 * Await the completion of the shared Scoreboard hydration.
 *
 * @returns {Promise<null | {
 * showMessage?: typeof import("../../components/Scoreboard.js")["showMessage"];
 * updateScore?: typeof import("../../components/Scoreboard.js")["updateScore"];
 * updateRoundCounter?: typeof import("../../components/Scoreboard.js")["updateRoundCounter"];
 * }>}
 * @pseudocode
 * return sharedScoreboardReady.catch(() => null)
 */
export function waitForSharedScoreboard() {
  return sharedScoreboardReady.catch(() => null);
}

/**
 * Get a DOM element by id.
 *
 * @summary Retrieve a DOM element using its id.
 * @param {string} id
 * @returns {HTMLElement | null}
 * @pseudocode
 * if typeof document is "undefined" -> return null
 * return document.getElementById(id)
 */
export const byId = (id) => (typeof document === "undefined" ? null : document.getElementById(id));

/**
 * Update the round header line.
 *
 * @summary Render round number and target points.
 * @param {number} round
 * @param {number} target
 * @returns {void}
 * @pseudocode
 * Phase 3: Primary: shared Scoreboard updateRoundCounter
 * Fallback: CLI element for visual consistency
 * root = byId("cli-root") -> set dataset.round and dataset.target
 */
export function updateRoundHeader(round, target) {
  // Phase 3: Primary update via shared Scoreboard component
  // Note: In CLI mode, the shared scoreboard's updateRoundCounter is skipped
  // via the scoreboardAdapter's isCliMode() check, so the CLI-specific
  // format with target will be preserved.
  try {
    if (sharedScoreboardHelpers?.updateRoundCounter) {
      sharedScoreboardHelpers.updateRoundCounter(round);
    }
  } catch {
    // Graceful fallback if shared component fails
  }

  // Phase 3: Keep CLI element for visual consistency (not primary source)
  const el = byId("round-counter");
  const root = byId("cli-root");
  let resolvedTarget = target;
  if (resolvedTarget === undefined || resolvedTarget === null || resolvedTarget === "") {
    try {
      const getter = engineFacade.getPointsToWin;
      if (typeof getter === "function") {
        resolvedTarget = getter();
      }
    } catch {}
  }
  if (resolvedTarget === undefined || resolvedTarget === null || resolvedTarget === "") {
    const existing = root?.dataset?.target;
    if (existing !== undefined) {
      resolvedTarget = Number.isNaN(Number(existing)) ? existing : Number(existing);
    }
  }
  if (resolvedTarget === undefined || resolvedTarget === null || resolvedTarget === "") {
    resolvedTarget = 5;
  }
  const displayTarget =
    typeof resolvedTarget === "number" && !Number.isNaN(resolvedTarget)
      ? resolvedTarget
      : String(resolvedTarget);
  if (el) {
    // Use clear format with space after colon: "Round 0 Target: 5"
    el.textContent = `Round ${round} Target: ${displayTarget}`;
    try {
      el.dataset.target = String(displayTarget);
    } catch {}
  }

  if (root) {
    root.dataset.round = String(round);
    root.dataset.target = String(displayTarget);
  }
}

/**
 * Set the round message text.
 *
 * @summary Display a message in the round banner.
 * @param {string} text
 * @returns {void}
 * @pseudocode
 * Phase 3: Primary: shared Scoreboard showMessage
 * Fallback: #round-message element (already shared between CLI and standard)
 */
export function setRoundMessage(text) {
  // Helper: strip common emoji/unicode pictographs for CLI-only output
  const stripEmoji = (s) =>
    String(s || "").replace(
      /[\u{1F300}-\u{1F6FF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/gu,
      ""
    );

  const isCliActive = Boolean(byId("cli-root"));
  const out = isCliActive ? stripEmoji(text) : text || "";

  // Phase 3: Primary update via shared Scoreboard component (sanitize for CLI)
  try {
    if (sharedScoreboardHelpers?.showMessage) {
      sharedScoreboardHelpers.showMessage(out || "", { outcome: false });
    }
  } catch {
    // Fallback will be used below
  }

  // Always keep CLI element in sync for deterministic tests and fallback UI
  try {
    const el = byId("round-message");
    if (el) el.textContent = out || "";
  } catch {}
}

/**
 * Update the scoreboard line.
 *
 * @summary Refresh scores for player and opponent.
 * @param {object} [scoreOverride] - Optional score values to render.
 * @param {number} [scoreOverride.playerScore] - Player score to display.
 * @param {number} [scoreOverride.opponentScore] - Opponent score to display.
 * @returns {void}
 * @pseudocode
 * Phase 3: Primary: shared Scoreboard updateScore
 * Fallback: CLI element for visual consistency
 */
export function updateScoreLine(scoreOverride) {
  let getScores;
  try {
    ({ getScores } = engineFacade);
  } catch {}
  const resolvedScores =
    scoreOverride ??
    (typeof getScores === "function" ? getScores() : { playerScore: 0, opponentScore: 0 });
  const { playerScore, opponentScore } = resolvedScores;

  // Phase 3: Primary update via shared Scoreboard component
  let sharedUpdated = false;
  try {
    if (sharedScoreboardHelpers?.updateScore) {
      sharedScoreboardHelpers.updateScore(playerScore, opponentScore);
      sharedUpdated = true;
    }
  } catch {
    // Fallback will be used below
  }

  // Phase 3: Keep CLI element for visual consistency (not primary source)
  const el = byId("score-display");
  if (!el) {
    return;
  }

  el.dataset.scorePlayer = String(playerScore);
  el.dataset.scoreOpponent = String(opponentScore);

  const playerValueNode = el.querySelector('[data-side="player"] [data-part="value"]');
  const opponentValueNode = el.querySelector('[data-side="opponent"] [data-part="value"]');

  if (!sharedUpdated || !playerValueNode || !opponentValueNode) {
    el.textContent = `You: ${playerScore} Opponent: ${opponentScore}`;
    return;
  }

  const playerText = String(playerScore);
  const opponentText = String(opponentScore);

  if (playerValueNode.textContent !== playerText) {
    playerValueNode.textContent = playerText;
  }
  if (opponentValueNode.textContent !== opponentText) {
    opponentValueNode.textContent = opponentText;
  }
}

/**
 * Clear verbose log output.
 *
 * @summary Remove any text from the verbose log.
 * @returns {void}
 * @pseudocode
 * el = byId("cli-verbose-log")
 * if el -> set textContent to ""
 */
export function clearVerboseLog() {
  const el = byId("cli-verbose-log");
  if (!el) return;
  el.textContent = "";
  refreshVerboseScrollIndicators();
}

function getVerboseElements() {
  return {
    section: byId("cli-verbose-section"),
    log: byId("cli-verbose-log")
  };
}

/**
 * Update scroll indicator state for the verbose log container.
 *
 * @returns {void}
 * @pseudocode
 * { section, log } = getVerboseElements()
 * if !section or !log -> return
 * scrollable = log.scrollHeight > log.clientHeight + 1
 * if !scrollable -> remove dataset flags and return
 * set dataset.scrollable = "true"
 * atTop = log.scrollTop <= 1, atBottom = scrollHeight - scrollTop - clientHeight <= 1
 * set dataset.scrollTop and dataset.scrollBottom based on position thresholds
 */
export function refreshVerboseScrollIndicators() {
  const { section, log } = getVerboseElements();
  if (!section || !log) return;

  const scrollable = log.scrollHeight > log.clientHeight + 1;
  if (!scrollable) {
    delete section.dataset.scrollable;
    delete section.dataset.scrollTop;
    delete section.dataset.scrollBottom;
    return;
  }

  section.dataset.scrollable = "true";
  const atTop = log.scrollTop <= 1;
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight <= 1;
  section.dataset.scrollTop = atTop ? "true" : "false";
  section.dataset.scrollBottom = atBottom ? "true" : "false";
}

/**
 * Attach listeners that keep verbose log scroll indicators in sync.
 *
 * @returns {void}
 * @pseudocode
 * { log } = getVerboseElements()
 * if !log -> return
 * if scroll listener not attached -> add passive "scroll" listener updating indicators
 * if resize listener not attached and window defined -> add passive "resize" listener updating indicators
 * refreshVerboseScrollIndicators()
 */
export function ensureVerboseScrollHandling() {
  const { log } = getVerboseElements();
  if (!log) return;
  if (!verboseScrollListenerAttached) {
    log.addEventListener(
      "scroll",
      () => {
        refreshVerboseScrollIndicators();
      },
      { passive: true }
    );
    verboseScrollListenerAttached = true;
  }
  if (!verboseResizeListenerAttached && typeof window !== "undefined") {
    window.addEventListener("resize", refreshVerboseScrollIndicators, { passive: true });
    verboseResizeListenerAttached = true;
  }
  refreshVerboseScrollIndicators();
}
