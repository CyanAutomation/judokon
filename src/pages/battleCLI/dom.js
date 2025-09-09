import * as engineFacade from "../../helpers/battleEngineFacade.js";

/**
 * Get a DOM element by id.
 * @param {string} id
 * @returns {HTMLElement | null}
 */
export const byId = (id) => document.getElementById(id);

/**
 * Update the round header line.
 * @param {number} round
 * @param {number} target
 */
export function updateRoundHeader(round, target) {
  const el = byId("cli-round");
  if (el) el.textContent = `Round ${round} Target: ${target} 🏆`;
  const root = byId("cli-root");
  if (root) {
    root.dataset.round = String(round);
    root.dataset.target = String(target);
  }
}

/**
 * Set the round message text.
 * @param {string} text
 */
export function setRoundMessage(text) {
  const el = byId("round-message");
  if (el) el.textContent = text || "";
}

/**
 * Update the scoreboard line.
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
}

/**
 * Clear verbose log output.
 */
export function clearVerboseLog() {
  const el = byId("cli-verbose-log");
  if (el) el.textContent = "";
}
