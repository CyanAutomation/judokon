/**
 * @summary DOM helper utilities for opponent card management.
 * @module domHelpers
 */

import { OPPONENT_PLACEHOLDER_ID } from "./opponentPlaceholder.js";

/**
 * @summary Get the opponent card container element from the DOM.
 *
 * @description Retrieves the opponent card container by ID, returning null on error or if document unavailable.
 *
 * @returns {HTMLElement|null} The opponent card container or null if not found.
 */
export function getOpponentCardContainer() {
  if (typeof document === "undefined") return null;
  try {
    return document.getElementById("opponent-card");
  } catch {
    return null;
  }
}

/**
 * @summary Determine whether the container currently holds a rendered opponent card.
 *
 * @description Safely queries the container for a judoka card element, returning false on error.
 *
 * @param {HTMLElement|null} container - The container to inspect.
 * @returns {boolean} True when a real opponent card is present.
 */
export function hasRealOpponentCard(container) {
  if (!container || typeof container.querySelector !== "function") return false;
  try {
    return !!container.querySelector(".judoka-card");
  } catch {
    return false;
  }
}

/**
 * @summary Determine whether the container has an opponent placeholder element.
 *
 * @description Safely queries the container for a placeholder element by ID.
 *
 * @param {HTMLElement|null} container - The container to inspect.
 * @returns {boolean} True when a placeholder element exists.
 */
export function hasOpponentPlaceholder(container) {
  if (!container || typeof container.querySelector !== "function") return false;
  try {
    return !!container.querySelector(`#${OPPONENT_PLACEHOLDER_ID}`);
  } catch {
    return false;
  }
}

/**
 * @summary Hide the opponent container when a real opponent card is visible.
 *
 * @description Adds or removes the opponent-hidden class based on card presence.
 *
 * @param {HTMLElement|null} container - The container to potentially hide.
 * @returns {HTMLElement|null} The container reference for chaining.
 */
export function hideOpponentCardIfRealVisible(container) {
  if (!container) return null;
  if (hasRealOpponentCard(container)) {
    try {
      container.classList.add("opponent-hidden");
    } catch {
      // Silently ignore errors when modifying classList
    }
    return container;
  }
  try {
    container.classList.remove("opponent-hidden");
  } catch {
    // Silently ignore errors when modifying classList
  }
  return container;
}

/**
 * @summary Ensure the opponent placeholder remains visible when no real card is rendered.
 *
 * @description Removes the opponent-hidden class when placeholder exists and no real card is present.
 *
 * @param {HTMLElement|null} container - The container whose visibility should be adjusted.
 * @returns {void}
 */
export function ensureOpponentPlaceholderVisibility(container) {
  if (!container) return;
  if (hasOpponentPlaceholder(container) && !hasRealOpponentCard(container)) {
    try {
      container.classList.remove("opponent-hidden");
    } catch {
      // Silently ignore errors when modifying classList
    }
  }
}
