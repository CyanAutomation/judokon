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
 * 3. When valid, ensure the dropdown exposes the sanitized target option.
 * 4. Refresh the CLI header metadata using the stored round number.
 *
 * @returns {void}
 */
export function syncWinTargetDropdown() {
  try {
    const select = byId("points-select");
    if (!select) return;

    let currentTarget = readPointsToWin();
    if (typeof currentTarget !== "number" || !Number.isFinite(currentTarget)) {
      try {
        const fallback =
          typeof document !== "undefined" && document?.body
            ? Number(document.body.dataset?.target)
            : NaN;
        if (Number.isFinite(fallback)) {
          currentTarget = fallback;
        }
      } catch {}
    }
    if (typeof currentTarget !== "number" || !Number.isFinite(currentTarget)) return;

    // Normalize to an integer so dropdown values stay in sync when the engine
    // emits floats or other non-integer numerics (e.g. Infinity).
    const normalizedTarget = Math.trunc(currentTarget);
    if (!Number.isFinite(normalizedTarget) || normalizedTarget <= 0) {
      return;
    }

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
