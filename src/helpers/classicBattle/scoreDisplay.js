import { updateScore as updateScoreboard } from "../setupScoreboard.js";

function normalizeScore(value) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeScores(playerScore, opponentScore) {
  return {
    player: normalizeScore(playerScore),
    opponent: normalizeScore(opponentScore)
  };
}

function renderScoreDisplay(playerScore, opponentScore) {
  if (typeof document === "undefined") {
    return;
  }

  const scoreEl = document.getElementById("score-display");
  if (!scoreEl) {
    return;
  }

  const playerSpan = document.createElement("span");
  playerSpan.dataset.side = "player";
  playerSpan.textContent = `You: ${playerScore}`;

  const opponentSpan = document.createElement("span");
  opponentSpan.dataset.side = "opponent";
  opponentSpan.textContent = `Opponent: ${opponentScore}`;

  const separator = document.createTextNode(" ");
  scoreEl.replaceChildren(playerSpan, separator, opponentSpan);
}

/**
 * @summary Update the DOM fallback for the classic battle scoreboard display.
 *
 * @pseudocode
 * 1. Normalize player and opponent scores to finite numbers with zero fallback.
 * 2. Locate the `#score-display` element when the DOM is available.
 * 3. Write deterministic markup mirroring the scoreboard component when the element exists.
 *
 * @param {number|unknown} playerScore - Player score to render.
 * @param {number|unknown} opponentScore - Opponent score to render.
 * @returns {void}
 */
export function writeScoreDisplay(playerScore, opponentScore) {
  const normalized = normalizeScores(playerScore, opponentScore);
  renderScoreDisplay(normalized.player, normalized.opponent);
}

/**
 * @summary Synchronize the scoreboard component and DOM fallback with normalized scores.
 *
 * @pseudocode
 * 1. Normalize incoming scores to finite numeric values.
 * 2. Attempt to update the scoreboard component when the helper is available.
 * 3. Always render the DOM fallback to keep the UI consistent.
 *
 * @param {number|unknown} playerScore - Player score to propagate.
 * @param {number|unknown} opponentScore - Opponent score to propagate.
 * @returns {{player: number, opponent: number}} Normalized score pair applied to the UI.
 */
export function syncScoreboardDisplay(playerScore, opponentScore) {
  const normalized = normalizeScores(playerScore, opponentScore);

  try {
    if (typeof updateScoreboard === "function") {
      updateScoreboard(normalized.player, normalized.opponent);
    }
  } catch {}

  renderScoreDisplay(normalized.player, normalized.opponent);

  return normalized;
}
