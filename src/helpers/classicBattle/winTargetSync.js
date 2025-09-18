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
  try {
    const header = byId("cli-round");
    if (header) {
      header.textContent = `Round ${round} Target: ${target}`;
    }
  } catch {}

  try {
    const root = byId("cli-root");
    if (root) {
      root.dataset.round = String(round);
      root.dataset.target = String(target);
    }
  } catch {}
}

/**
 * Read the points-to-win value from the battle engine facade.
 *
 * @returns {number | null} The configured target or null when unavailable.
 */
function readPointsToWin() {
  try {
    const value = Number(getPointsToWin());
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Synchronise the win target dropdown with the battle engine setting.
 *
 * @pseudocode
 * 1. Lookup `#points-select`; exit when missing.
 * 2. Read the current points-to-win from the battle engine.
 * 3. When valid, set the dropdown value to match.
 * 4. Refresh the CLI header metadata using the stored round number.
 *
 * @returns {void}
 */
export function syncWinTargetDropdown() {
  try {
    const select = byId("points-select");
    if (!select) return;

    const currentTarget = readPointsToWin();
    if (typeof currentTarget !== "number" || !Number.isFinite(currentTarget)) return;

    select.value = String(currentTarget);
    const round = getCurrentRoundNumber();
    updateRoundHeader(round, currentTarget);
  } catch {}
}
