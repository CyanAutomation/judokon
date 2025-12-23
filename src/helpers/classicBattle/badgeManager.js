/**
 * badgeManager.js
 *
 * Centralized management for the battle state badge element.
 * Handles badge visibility, text content, and feature flag integration.
 *
 * @pseudocode
 * - Provide functions to initialize and update the battle state badge
 * - Check feature flag overrides for badge visibility
 * - Support safe DOM manipulations with error handling
 * - Allow both initialization and runtime updates
 */

import { getBattleStateBadge } from "./UIElements.js";

/**
 * Check if battle state badge feature is enabled.
 * Checks the window.__FF_OVERRIDES object for battleStateBadge flag.
 *
 * @returns {boolean} True if badge feature is enabled
 */
function isBadgeFeatureEnabled() {
  try {
    return (
      typeof window !== "undefined" &&
      window.__FF_OVERRIDES &&
      window.__FF_OVERRIDES.battleStateBadge === true
    );
  } catch {
    return false;
  }
}

/**
 * Initialize the battle state badge element based on feature flag state.
 * Sets initial visibility and content of the badge.
 *
 * @summary Sets the initial visibility and content of the battle state badge.
 *
 * @param {object} [options={}] - Configuration options for initializing the badge.
 * @param {boolean} [options.force=true] - If true, forces the badge's visibility and sets its text to "Lobby", overriding existing content if it doesn't contain "Round".
 * @returns {void}
 * @pseudocode
 * 1. Check if a `battleStateBadge` feature flag override is enabled via `window.__FF_OVERRIDES`.
 * 2. Attempt to retrieve the DOM element with the ID `battle-state-badge`. If the element is not found, the function exits.
 * 3. If the `battleStateBadge` override is enabled:
 *    a. Ensure the badge is visible by setting `hidden` to `false` and removing the `hidden` attribute.
 *    b. Determine the badge's text content: if `force` is true or the current text does not contain "Round", set the text content to "Lobby". Otherwise, preserve the existing text.
 * 4. All DOM manipulations are wrapped in a try-catch block to gracefully handle potential errors.
 */
export function initBattleStateBadge(options = {}) {
  const { force = true } = options;
  try {
    const overrideEnabled = isBadgeFeatureEnabled();
    const badge = getBattleStateBadge();
    if (!badge) return;

    if (overrideEnabled) {
      makeBadgeVisible(badge);
      const txt = String(badge.textContent || "");
      if (force || !/\bRound\b/i.test(txt)) {
        badge.textContent = "Lobby";
      }
    }
  } catch (err) {
    console.debug("battleClassic: badge setup failed", err);
  }
}

/**
 * Make the badge element visible.
 * Sets hidden attribute to false and removes the hidden attribute.
 *
 * @param {HTMLElement} badge - The badge element
 * @returns {void}
 */
function makeBadgeVisible(badge) {
  if (!badge) return;
  try {
    badge.hidden = false;
    badge.removeAttribute("hidden");
  } catch {}
}

/**
 * Set the text content of the battle state badge.
 * Only updates if the badge feature is enabled.
 *
 * @param {string} text - The text to display in the badge
 * @returns {void}
 * @pseudocode
 * 1. If the battle state badge feature is disabled, exit early.
 * 2. Retrieve the badge element and exit if it is missing.
 * 3. Make the badge visible so the update is user-visible.
 * 4. Set the badge text to the provided value, defaulting to "Lobby" when empty.
 */
export function setBadgeText(text) {
  try {
    if (!isBadgeFeatureEnabled()) return;
    const badge = getBattleStateBadge();
    if (!badge) return;
    makeBadgeVisible(badge);
    badge.textContent = String(text || "Lobby");
  } catch {}
}

/**
 * Initialize badge and sync with current game state.
 * This is a convenience wrapper for initial badge setup.
 *
 * @returns {void}
 * @pseudocode
 * 1. Call `initBattleStateBadge` with `force: true` to ensure visibility.
 * 2. Allow downstream logic to overwrite the text with the current state.
 */
export function initBadgeSync() {
  initBattleStateBadge({ force: true });
}

/**
 * Ensure the lobby badge is displayed with correct visibility state.
 * Force the badge to show "Lobby" text without overriding existing "Round" text.
 *
 * @returns {void}
 * @pseudocode
 * 1. Invoke `initBattleStateBadge` with `force: false`.
 * 2. Preserve existing "Round" text while making the badge visible when needed.
 */
export function ensureLobbyBadge() {
  initBattleStateBadge({ force: false });
}
