import * as engineFacade from "../../helpers/battleEngineFacade.js";

// Phase 4: Simplified scoreboard helpers - now primarily rely on shared Scoreboard adapter
// Dynamic import kept for fallback scenarios only
let sharedScoreboardHelpers = null;
try {
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
 * Phase 3: Primary: shared Scoreboard updateRoundCounter
 * Fallback: CLI element for visual consistency
 * root = byId("cli-root") -> set dataset.round and dataset.target
 */
export function updateRoundHeader(round, target) {
  // Phase 3: Primary update via shared Scoreboard component
  let sharedUpdated = false;
  try {
    if (sharedScoreboardHelpers?.updateRoundCounter) {
      sharedScoreboardHelpers.updateRoundCounter(round);
      sharedUpdated = true;
    }
  } catch {
    // Fallback will be used below
  }

  // Phase 3: Keep CLI element for visual consistency (not primary source)
  const el = byId("cli-round");
  if (el && !sharedUpdated) {
    // Only update CLI element if shared component failed
    el.textContent = `Round ${round} Target: ${target}`;
  } else if (el) {
    // Update to match shared component format
    el.textContent = `🥋 Round ${round}`;
  }

  const root = byId("cli-root");
  if (root) {
    root.dataset.round = String(round);
    root.dataset.target = String(target);
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
  // Phase 3: Primary update via shared Scoreboard component
  let sharedUpdated = false;
  try {
    if (sharedScoreboardHelpers?.showMessage) {
      sharedScoreboardHelpers.showMessage(text || "", { outcome: false });
      sharedUpdated = true;
    }
  } catch {
    // Fallback will be used below
  }

  // Fallback: Direct DOM update (shared element already used by both)
  if (!sharedUpdated) {
    const el = byId("round-message");
    if (el) el.textContent = text || "";
  }
}

/**
 * Update the scoreboard line.
 *
 * @summary Refresh scores for player and opponent.
 * @returns {void}
 * @pseudocode
 * Phase 3: Primary: shared Scoreboard updateScore
 * Fallback: CLI element for visual consistency
 */
export function updateScoreLine() {
  const { playerScore, opponentScore } = engineFacade.getScores?.() || {
    playerScore: 0,
    opponentScore: 0
  };

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
  const el = byId("cli-score");
  if (el && !sharedUpdated) {
    // Only update CLI element if shared component failed
    el.textContent = `You: ${playerScore} Opponent: ${opponentScore}`;
    el.dataset.scorePlayer = String(playerScore);
    el.dataset.scoreOpponent = String(opponentScore);
  } else if (el) {
    // Update to match shared component format
    el.textContent = `📊 You: ${playerScore} Opponent: ${opponentScore}`;
    el.dataset.scorePlayer = String(playerScore);
    el.dataset.scoreOpponent = String(opponentScore);
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
