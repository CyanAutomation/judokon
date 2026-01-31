import { getScores } from "../BattleEngine.js";
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

function ensureScoreSpacing(container, firstSpan, secondSpan, doc) {
  if (!firstSpan || !secondSpan) return;
  const separator = firstSpan.nextSibling;
  if (!separator || separator.nodeType !== 3) {
    container.insertBefore(doc.createTextNode(" "), secondSpan);
  } else if (!/\s/.test(separator.textContent || "")) {
    separator.textContent = " ";
  }
}

function ensureSideSpacing(sideSpan, doc) {
  if (!sideSpan) return null;
  const label = sideSpan.querySelector('[data-part="label"]');
  const value = sideSpan.querySelector('[data-part="value"]');
  if (!label || !value) return { label, value };
  const separator = label.nextSibling;
  if (!separator || separator.nodeType !== 3) {
    sideSpan.insertBefore(doc.createTextNode(" "), value);
  } else if (!/\s/.test(separator.textContent || "")) {
    separator.textContent = " ";
  }
  return { label, value };
}

function ensureScoreNode(container, side, labelText, doc) {
  if (!container || !doc?.createElement) {
    return { value: null };
  }

  let sideSpan = container.querySelector(`[data-side="${side}"]`);
  if (!sideSpan) {
    sideSpan = doc.createElement("span");
    sideSpan.dataset.side = side;
    container.appendChild(sideSpan);
  }

  let label = sideSpan.querySelector('[data-part="label"]');
  if (!label) {
    label = doc.createElement("span");
    label.dataset.part = "label";
    sideSpan.insertBefore(label, sideSpan.firstChild);
  }
  label.textContent = labelText;

  let value = sideSpan.querySelector('[data-part="value"]');
  if (!value) {
    value = doc.createElement("span");
    value.dataset.part = "value";
    sideSpan.appendChild(value);
  }

  ensureSideSpacing(sideSpan, doc);

  return { sideSpan, value };
}

function renderScoreDisplay(playerScore, opponentScore) {
  if (typeof document === "undefined") {
    return;
  }

  const scoreEl = document.getElementById("score-display");
  if (!scoreEl) {
    return;
  }

  const doc = scoreEl.ownerDocument || document;
  const { sideSpan: playerSpan, value: playerValue } = ensureScoreNode(
    scoreEl,
    "player",
    "You:",
    doc
  );
  const { sideSpan: opponentSpan, value: opponentValue } = ensureScoreNode(
    scoreEl,
    "opponent",
    "Opponent:",
    doc
  );

  if (playerValue) {
    playerValue.textContent = String(playerScore);
  }
  if (opponentValue) {
    opponentValue.textContent = String(opponentScore);
  }

  ensureScoreSpacing(scoreEl, playerSpan, opponentSpan, doc);
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

/**
 * @summary Synchronize scoreboard UI with the battle engine scores.
 *
 * @pseudocode
 * 1. Read the latest scores from the battle engine.
 * 2. Log debug details in test environments.
 * 3. Update the scoreboard component and DOM fallback.
 * 4. Log the updated DOM text in test environments.
 *
 * @returns {void}
 */
export function syncScoreDisplay() {
  let playerScore = 0;
  let opponentScore = 0;

  try {
    const result = typeof getScores === "function" ? getScores() : null;
    if (result && typeof result === "object") {
      playerScore = typeof result.playerScore === "number" ? result.playerScore : 0;
      opponentScore = typeof result.opponentScore === "number" ? result.opponentScore : 0;
    }
  } catch {}

  // Debug logging for tests
  try {
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      console.log("[DEBUG] syncScoreDisplay called:", { playerScore, opponentScore });
    }
  } catch {}

  syncScoreboardDisplay(playerScore, opponentScore);

  try {
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      const el = document.getElementById("score-display");
      if (el) {
        console.log("[DEBUG] syncScoreDisplay updated DOM:", el.textContent);
      }
    }
  } catch {}
}
