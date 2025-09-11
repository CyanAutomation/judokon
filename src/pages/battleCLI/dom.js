import * as engineFacade from "../../helpers/battleEngineFacade.js";

// Phase 2: Import shared Scoreboard helpers for dual-write
let sharedScoreboardHelpers = null;
try {
  // Lazy import to avoid circular dependencies during module loading
  import("../../components/Scoreboard.js").then((module) => {
    sharedScoreboardHelpers = {
      showMessage: module.showMessage,
      updateScore: module.updateScore,
      updateRoundCounter: module.updateRoundCounter
    };
  });
} catch {
  // Graceful fallback if shared Scoreboard not available
}

/**
 * Get a DOM element by id.
 *
 * @summary Retrieve a DOM element using its id.
 * @param {string} id
 * @returns {HTMLElement | null}
 * @pseudocode
 * return document.getElementById(id)
 */
export const byId = (id) => document.getElementById(id);

/**
 * Update the round header line.
 *
 * @summary Render round number and target points.
 * @param {number} round
 * @param {number} target
 * @returns {void}
 * @pseudocode
 * el = byId("cli-round")
 * if el -> set text to `Round ${round} Target: ${target}`
 * root = byId("cli-root")
 * if root -> set dataset.round and dataset.target
 * Phase 2: Also update shared Scoreboard component
 */
export function updateRoundHeader(round, target) {
  const el = byId("cli-round");
  if (el) el.textContent = `Round ${round} Target: ${target}`;
  const root = byId("cli-root");
  if (root) {
    root.dataset.round = String(round);
    root.dataset.target = String(target);
  }

  // Phase 2: Dual-write to shared Scoreboard component
  try {
    if (sharedScoreboardHelpers?.updateRoundCounter) {
      sharedScoreboardHelpers.updateRoundCounter(round);
    }
  } catch {
    // Graceful fallback if shared Scoreboard not available
  }
}

/**
 * Set the round message text.
 *
 * @summary Display a message in the round banner.
 * @param {string} text
 * @returns {void}
 * @pseudocode
 * el = byId("round-message")
 * if el -> set textContent to text or ""
 * Phase 2: Also update shared Scoreboard component
 */
export function setRoundMessage(text) {
  const el = byId("round-message");
  if (el) el.textContent = text || "";

  // Phase 2: Dual-write to shared Scoreboard component
  try {
    if (sharedScoreboardHelpers?.showMessage) {
      sharedScoreboardHelpers.showMessage(text || "", { outcome: false });
    }
  } catch {
    // Graceful fallback if shared Scoreboard not available
  }
}

/**
 * Update the scoreboard line.
 *
 * @summary Refresh scores for player and opponent.
 * @returns {void}
 * @pseudocode
 * scores = engineFacade.getScores() or {0,0}
 * el = byId("cli-score")
 * if el -> update textContent and data attributes with scores
 * Phase 2: Also update shared Scoreboard component
 */
export function updateScoreLine() {
  const { playerScore, opponentScore } = engineFacade.getScores?.() || {
    playerScore: 0,
    opponentScore: 0
  };
  const el = byId("cli-score");
  if (el) {
    el.textContent = `You: ${playerScore} Opponent: ${opponentScore}`;
    el.dataset.scorePlayer = String(playerScore);
    el.dataset.scoreOpponent = String(opponentScore);
  }

  // Phase 2: Dual-write to shared Scoreboard component
  try {
    if (sharedScoreboardHelpers?.updateScore) {
      sharedScoreboardHelpers.updateScore(playerScore, opponentScore);
    }
  } catch {
    // Graceful fallback if shared Scoreboard not available
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
  if (el) el.textContent = "";
}
