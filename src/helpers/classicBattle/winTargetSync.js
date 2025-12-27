import { getPointsToWin } from "../battleEngineFacade.js";

/**
 * Safely retrieve an element by id.
 *
 * @param {string} id - Element id to lookup.
 * @returns {HTMLElement | null}
 */
function byId(id) {
  try {
    return typeof document === "undefined" ? null : document.getElementById(id);
  } catch {
    return null;
  }
}

/**
 * Sanitize a points-to-win value into a positive integer.
 *
 * @param {unknown} value - Candidate value from data or engine.
 * @returns {number | null} The normalized target or null when invalid.
 */
function sanitizeTarget(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const normalized = Math.trunc(numeric);
  if (!Number.isFinite(normalized) || normalized <= 0) return null;
  return normalized;
}

/**
 * Read the current round number from the CLI root element.
 *
 * @returns {number} The round stored on the CLI dataset, or 0 when unavailable.
 */
function getCurrentRoundNumber() {
  try {
    const root = byId("cli-root");
    const value = Number(root?.dataset?.round);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/**
 * Update CLI header metadata to reflect the provided round and target.
 *
 * @param {number} round - Current round number.
 * @param {number} target - Points required to win the match.
 * @returns {void}
 */
function updateRoundHeader(round, target) {
  const roundCounter = byId("round-counter");
  if (roundCounter) {
    roundCounter.textContent = `Round ${round} Target: ${target}`;
    roundCounter.dataset.target = String(target);
  }

  const root = byId("cli-root");
  if (root) {
    root.dataset.round = String(round);
    root.dataset.target = String(target);
  }
}

/**
 * Read the points-to-win value from the battle engine facade.
 *
 * @returns {number | null} The configured target or null when unavailable.
 */
function readPointsToWin() {
  let value = null;
  try {
    value = sanitizeTarget(getPointsToWin());
  } catch {
    value = null;
  }
  if (value !== null) return value;
  if (typeof document === "undefined") return null;
  return sanitizeTarget(document.body?.dataset?.target);
}

/**
 * Synchronise the win target dropdown with the battle engine setting.
 *
 * @pseudocode
 * 1. Lookup `#points-select`; exit when missing.
 * 2. Read the current points-to-win from the battle engine.
 * 3. When valid, ensure the dropdown exposes the sanitized target option.
 * 4. Refresh the CLI header metadata using the stored round number.
 *
 * @returns {void}
 */
export function syncWinTargetDropdown() {
  try {
    const select = byId("points-select");
    if (!select) return;

    const normalizedTarget = readPointsToWin();
    if (normalizedTarget === null) return;

    try {
      const hasOption = Array.from(select.options || []).some(
        (option) => Number(option.value) === normalizedTarget
      );
      if (!hasOption && typeof document !== "undefined") {
        const option = document.createElement("option");
        option.value = String(normalizedTarget);
        option.textContent = String(normalizedTarget);
        select.appendChild(option);
      }
    } catch {}

    const normalizedValue = String(normalizedTarget);
    select.value = normalizedValue;
    const round = getCurrentRoundNumber();
    updateRoundHeader(round, normalizedTarget);
  } catch {}
}
